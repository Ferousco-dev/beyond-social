// Authenticated endpoint: starts a kie.ai video generation for the signed-in
// user, after verifying they have credits, and records the task.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/http.ts";
import { createVideoTask } from "../_shared/kie.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

interface GenerateBody {
  projectId?: string;
  prompt?: string;
  aspectRatio?: string;
  imageUrls?: string[];
  /** Seconds. Only present when the request actually asked for a length. */
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

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const prompt = body.prompt?.trim();
  if (!body.projectId || !prompt) {
    return json({ error: "projectId and prompt are required" }, 400);
  }

  // Enforce the credit quota before spending money on a generation.
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_total, credits_used")
    .eq("id", user.id)
    .single();
  if (profile && profile.credits_used >= profile.credits_total) {
    return json({ error: "No video credits remaining" }, 402);
  }

  const aspectRatio =
    body.aspectRatio === "16:9" || body.aspectRatio === "Auto" ? body.aspectRatio : "9:16";

  // The provider accepts a fixed set of lengths; anything else is rejected
  // outright rather than rounded, so an out-of-range request falls back to the
  // default instead of failing the whole generation.
  const ALLOWED_DURATIONS = [4, 6, 8];
  const duration =
    typeof body.duration === "number" && ALLOWED_DURATIONS.includes(body.duration)
      ? body.duration
      : 8;
  const callbackSecret = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  const callBackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-callback?token=${callbackSecret}`;

  let taskId: string;
  try {
    taskId = await createVideoTask({
      prompt,
      imageUrls: body.imageUrls?.slice(0, 2),
      aspectRatio,
      duration,
      callBackUrl,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Generation failed" }, 502);
  }

  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: body.projectId,
      user_id: user.id,
      prompt,
      aspect_ratio: aspectRatio,
      duration,
      image_urls: body.imageUrls ?? [],
      status: "generating",
      provider_task_id: taskId,
      // Carried on the row because the callback arrives in a different process,
      // minutes later, where no header from the original request survives.
      trace_id: traceId,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    log("error", "could not record the generation", { traceId, taskId });
    return json({ error: "Could not record the generation" }, 500);
  }

  log("info", "generation submitted", { traceId, taskId, generationId: generation.id });
  return json({ generationId: generation.id, taskId });
});
