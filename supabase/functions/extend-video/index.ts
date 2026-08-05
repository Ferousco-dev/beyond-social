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

import { corsHeaders, json } from "../_shared/http.ts";
import { createMarketVideoTask, extendVideoTask } from "../_shared/kie.ts";
import { capabilityOf, resolveDuration } from "../_shared/video-capabilities.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_total, credits_used")
    .eq("id", user.id)
    .maybeSingle();
  if (profile && profile.credits_used >= profile.credits_total) {
    return json({ error: "No video credits remaining" }, 402);
  }

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

  const callbackSecret = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  const callBackUrl = callbackSecret
    ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-callback?token=${callbackSecret}`
    : undefined;

  const continuation = capabilityOf(source.model).continuation;
  let taskId: string;
  let duration: number = source.duration ?? 8;

  if (continuation === "native-extend") {
    if (!source.provider_task_id) {
      return json({ error: "That video has no provider task to continue from" }, 409);
    }
    if (source.resolution === "1080p" || source.resolution === "4k") {
      return json({ error: "Videos rendered above 720p cannot be continued" }, 409);
    }
    try {
      taskId = await extendVideoTask({
        taskId: source.provider_task_id,
        prompt,
        callBackUrl,
      });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Could not continue" }, 502);
    }
  } else {
    duration = resolveDuration(source.model, body.duration ?? source.duration);
    try {
      taskId = await createMarketVideoTask({
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
      return json({ error: error instanceof Error ? error.message : "Could not continue" }, 502);
    }
  }

  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: source.project_id,
      user_id: user.id,
      prompt,
      duration,
      aspect_ratio: source.aspect_ratio,
      status: "generating",
      model: source.model,
      provider_task_id: taskId,
      extended_from: source.id,
      trace_id: traceId,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    log("error", "could not record the extension", { traceId, taskId });
    return json({ error: "Could not record the extension" }, 500);
  }

  log("info", "extension submitted", { traceId, taskId, generationId: generation.id });
  return json({ generationId: generation.id, taskId });
});
