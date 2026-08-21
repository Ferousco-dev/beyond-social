// Authenticated endpoint: continues a clip the caller already made, and
// records the continuation as a generation of its own.
//
// Two paths depending on the model:
//
//  - Veo: the provider has a dedicated `/veo/extend` endpoint that continues
//    a task by id. Audio carries over, but vocals only if they fall in the
//    clip's final second.
//
//  - Everything else: a fresh generation on the same model, linked to the
//    source via `extended_from`. The prompt carries the creative direction
//    for what happens next. Each call costs one credit, and the user can
//    chain as many as they want.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { abandonRun, adminClient, reserveCredits } from "../_shared/credits.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { createMarketVideoTask, extendVideoTask } from "../_shared/kie.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";
import { capabilityOf, resolveDuration } from "../_shared/video-capabilities.ts";

interface ExtendBody {
  generationId?: string;
  prompt?: string;
  duration?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  const traceId = traceIdFrom(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: ExtendBody;
  try {
    body = (await req.json()) as ExtendBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const prompt = body.prompt?.trim();
  if (!body.generationId || !prompt) {
    return json({ error: "generationId and prompt are required" }, 400);
  }

  // RLS scopes this to the caller's own rows, so a generation id that belongs
  // to someone else reads as one that does not exist.
  const { data: source } = await supabase
    .from("video_generations")
    .select("id, project_id, model, status, provider_task_id, resolution, aspect_ratio, duration")
    .eq("id", body.generationId)
    .maybeSingle();

  if (!source) return json({ error: "That video could not be found" }, 404);
  if (source.status !== "ready") {
    return json({ error: "Only a finished video can be continued" }, 409);
  }

  // Motion control copies motion from footage; continuing it makes no sense
  // because there is no footage to continue from.
  if (source.model === "kling-3.0/motion-control") {
    return json({ error: "A motion-control clip cannot be continued" }, 400);
  }

  const continuation = capabilityOf(source.model).continuation;

  if (continuation === "native-extend") {
    if (!source.provider_task_id) {
      return json({ error: "That video has no provider task to continue from" }, 409);
    }
    if (source.resolution === "1080p" || source.resolution === "4k") {
      return json({ error: "Videos rendered above 720p cannot be continued" }, 409);
    }
  }

  const duration =
    continuation === "native-extend"
      ? (source.duration ?? 8)
      : resolveDuration(source.model, body.duration ?? source.duration);

  /*
   * The row is written, and the credits reserved, before the provider is
   * called. This used to read `profiles.credits_used` against
   * `credits_total`, a cache with no lock on it, checked before dispatch and
   * never touched again until the callback settled the row minutes later. Two
   * continuations started together could both read the same balance, both
   * pass, and both dispatch: the exact race credit reservation exists to
   * close, just never wired in here. The same ordering `generate-video` uses.
   */
  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: source.project_id,
      user_id: user.id,
      prompt,
      duration,
      aspect_ratio: source.aspect_ratio,
      status: "queued",
      model: source.model,
      extended_from: source.id,
      trace_id: traceId,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    log("error", "could not record the extension", { traceId });
    return json({ error: "Could not record the extension" }, 500);
  }

  // Nothing is dispatched until the credits are actually held.
  const admin = adminClient();
  const reservation = await reserveCredits(admin, generation.id);
  if (!reservation.held) {
    log("error", "extension credit reservation refused", { traceId, generationId: generation.id });
    await abandonRun(admin, generation.id, reservation.reason);
    return json({ error: reservation.reason, generationId: generation.id }, reservation.status);
  }

  const callbackSecret = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  const callBackUrl = callbackSecret
    ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-callback?token=${callbackSecret}`
    : undefined;

  let taskId: string;
  try {
    taskId =
      continuation === "native-extend"
        ? await extendVideoTask({
            // Checked above: this branch does not run without a source task id.
            taskId: source.provider_task_id as string,
            prompt,
            callBackUrl,
          })
        : await createMarketVideoTask({
            model: source.model,
            prompt,
            imageUrls: [],
            videoUrls: [],
            aspectRatio: source.aspect_ratio ?? "9:16",
            duration,
            shots: [],
            callBackUrl,
          });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not continue";
    // Nothing rendered, so the reservation is given back on the way out.
    await abandonRun(admin, generation.id, message);
    return json({ error: message, generationId: generation.id }, 502);
  }

  const { error: dispatchError } = await admin
    .from("video_generations")
    .update({ status: "generating", provider_task_id: taskId })
    .eq("id", generation.id);

  if (dispatchError) {
    // The render is running and we cannot follow it, so it can only be settled
    // as failed. Refunding is the right side to err on: we cannot show a
    // result we have lost the handle to.
    log("error", "could not record the dispatched extension task", { traceId, taskId });
    await abandonRun(admin, generation.id, "Could not follow this render");
    return json({ error: "Could not record the extension", generationId: generation.id }, 500);
  }

  log("info", "extension submitted", { traceId, taskId, generationId: generation.id });
  return json({ generationId: generation.id, taskId });
});
