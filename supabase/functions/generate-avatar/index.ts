// Authenticated endpoint: renders a photo of a person speaking an audio track,
// after checking credits and that the caller has attested the likeness is
// theirs. Records the task the same way a video generation is recorded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/http.ts";
import { createAvatarTask } from "../_shared/kie.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/** Bumped with the wording of the consent statement; older acceptances lapse. */
const CONSENT_VERSION = 1;

const MODEL = "infinitalk/from-audio";

interface AvatarBody {
  projectId?: string;
  prompt?: string;
  imageUrl?: string;
  audioUrl?: string;
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

  let body: AvatarBody;
  try {
    body = (await req.json()) as AvatarBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const prompt = body.prompt?.trim();
  if (!body.projectId || !prompt || !body.imageUrl || !body.audioUrl) {
    return json({ error: "projectId, prompt, imageUrl and audioUrl are required" }, 400);
  }

  /*
   * Consent is checked here rather than only in the UI.
   *
   * Animating a face with a voice is the shape of a deepfake when the face is
   * not the uploader's, and a checkbox on a client is not a control. This is
   * the last point before someone else's likeness is sent to a third party, so
   * it is where the attestation has to be true.
   */
  const { data: consent } = await supabase
    .from("likeness_consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("statement_version", CONSENT_VERSION)
    .limit(1)
    .maybeSingle();
  if (!consent) return json({ error: "Likeness consent is required", code: "consent" }, 403);

  // The model has to be live and affordable before anything is dispatched: the
  // provider charges on submission and cannot cancel.
  const { data: model } = await supabase
    .from("model_catalog")
    .select("credit_cost, is_active")
    .eq("id", MODEL)
    .maybeSingle();
  if (!model?.is_active) return json({ error: "Avatar rendering is not available yet" }, 503);

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_total, credits_used")
    .eq("id", user.id)
    .single();
  const cost = model.credit_cost ?? 1;
  if (profile && profile.credits_used + cost > profile.credits_total) {
    return json({ error: "Not enough credits for an avatar render" }, 402);
  }

  const callbackSecret = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  const callBackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-callback?token=${callbackSecret}`;

  let taskId: string;
  try {
    taskId = await createAvatarTask({
      imageUrl: body.imageUrl,
      audioUrl: body.audioUrl,
      prompt,
      callBackUrl,
    });
  } catch (error) {
    log("error", "avatar task failed", { traceId });
    return json({ error: error instanceof Error ? error.message : "Generation failed" }, 502);
  }

  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: body.projectId,
      user_id: user.id,
      prompt,
      aspect_ratio: "9:16",
      image_urls: [body.imageUrl],
      status: "generating",
      provider_task_id: taskId,
      // Recorded so completion prices this against the avatar rate rather than
      // the video one, and so polling knows which status endpoint to ask.
      model: MODEL,
      trace_id: traceId,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    log("error", "could not record the avatar generation", { traceId, taskId });
    return json({ error: "Could not record the generation" }, 500);
  }

  log("info", "avatar submitted", { traceId, taskId, generationId: generation.id });
  return json({ generationId: generation.id, taskId });
});
