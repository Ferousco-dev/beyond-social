// Authenticated endpoint: continues a clip the provider already made, and
// records the continuation as a generation of its own.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/http.ts";
import { extendVideoTask } from "../_shared/kie.ts";
import { capabilityOf } from "../_shared/video-capabilities.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

interface ExtendBody {
  /** The finished generation to continue. */
  generationId?: string;
  /** How the continuation should go. */
  prompt?: string;
}

/**
 * Only veo output can be continued, and only through the task that made it.
 *
 * The provider identifies the source by task id rather than by file, so a clip
 * we did not generate cannot be extended at all, and neither can one whose task
 * id we never recorded. Both are checked here rather than discovered as a
 * provider error after the credit is gone.
 */
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

  // Enforce the credit quota before spending money, exactly as a fresh
  // generation does: an extension is a paid render, not a free continuation.
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_total, credits_used")
    .eq("id", user.id)
    .maybeSingle();
  if (profile && profile.credits_used >= profile.credits_total) {
    return json({ error: "No video credits remaining" }, 402);
  }

  /*
   * Read through the owner's own client, so row-level security decides whether
   * this generation is theirs to continue rather than a check written here.
   */
  const { data: source } = await supabase
    .from("video_generations")
    .select("id, project_id, model, status, provider_task_id, resolution, aspect_ratio")
    .eq("id", body.generationId)
    .maybeSingle();

  if (!source) return json({ error: "That video could not be found" }, 404);
  if (source.status !== "ready") {
    return json({ error: "Only a finished video can be continued" }, 409);
  }
  if (!source.provider_task_id) {
    return json({ error: "That video has no provider task to continue from" }, 409);
  }
  if (capabilityOf(source.model).continuation !== "native-extend") {
    return json(
      { error: `${source.model} cannot continue an existing clip; regenerate it longer instead` },
      400,
    );
  }
  /*
   * The provider refuses to extend anything it rendered at 1080p. Saying so
   * here is the difference between an explanation and a failed paid call, and
   * it is the reason 720p is the default everywhere.
   */
  if (source.resolution === "1080p" || source.resolution === "4k") {
    return json({ error: "Videos rendered above 720p cannot be continued" }, 409);
  }

  const callbackSecret = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  const callBackUrl = callbackSecret
    ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-callback?secret=${callbackSecret}`
    : undefined;

  let taskId: string;
  try {
    taskId = await extendVideoTask({
      taskId: source.provider_task_id,
      prompt,
      callBackUrl,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not continue" }, 502);
  }

  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: source.project_id,
      user_id: user.id,
      prompt,
      aspect_ratio: source.aspect_ratio,
      status: "generating",
      // The continuation runs on the same model, so it prices and polls the
      // same way the source did.
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
