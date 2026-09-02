// Authenticated endpoint: renders a photo of a person speaking an audio track,
// after checking credits and that the caller has attested the likeness is
// theirs. Records the task the same way a video generation is recorded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { abandonRun, adminClient, reserveCredits } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { callbackUrl } from "../_shared/kie-callback-auth.ts";
import { createAvatarTask } from "../_shared/kie.ts";
import { handToProvider } from "../_shared/reference.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/**
 * Bumped with the wording of the consent statement; older acceptances lapse.
 *
 * Duplicated from `features/generation/consent.ts` because an edge function
 * cannot import from the app. That drift is real and has already bitten: the
 * statement moved to 2 there while this still read 1, which refuses every
 * avatar render from someone who accepted the current wording. Change both.
 */
const CONSENT_VERSION = 2;

/** The cheapest avatar model, used when the caller does not name one. */
const DEFAULT_MODEL = "infinitalk/from-audio";

/**
 * What resolution to ask each model for.
 *
 * The provider bills per second and the rate depends on this, so it is not a
 * quality preference but a price. InfiniteTalk is asked for its cheapest tier;
 * the Kling models are priced in the catalogue at the tier named here, so
 * asking for a different one would charge the user for something else.
 */
const RESOLUTION: Record<string, string> = {
  "infinitalk/from-audio": "480p",
  "kling/ai-avatar-standard": "720p",
  "kling/ai-avatar-pro": "1080p",
};

interface AvatarBody {
  projectId?: string;
  prompt?: string;
  imageUrl?: string;
  audioUrl?: string;
  /** Object paths in the uploads bucket. Preferred over the URLs above. */
  imagePath?: string;
  audioPath?: string;
  /** Which avatar model to run. Validated against the catalogue below. */
  model?: string;
}

serve(async (req) => {
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

  /*
   * The model has to be live before anything is dispatched: the provider
   * charges on submission and cannot cancel.
   *
   * The requested id is looked up rather than trusted. Constraining the query
   * to the avatar family is what stops a caller naming a video model here and
   * being charged that model's rate for a request this endpoint would send to
   * the wrong provider endpoint entirely.
   */
  const requested = body.model ?? DEFAULT_MODEL;
  const { data: model } = await supabase
    .from("model_catalog")
    .select("id, is_active")
    .eq("id", requested)
    .eq("family", "avatar")
    .maybeSingle();
  if (!model?.is_active) return json({ error: "That avatar model is not available" }, 503);

  /*
   * The row is written before the provider is called, because the credits are
   * taken before the provider is called and the reservation needs something to
   * hang off. The same ordering `generate-video` uses, and for the same
   * reason: this used to read `profiles.credits_used` against
   * `credits_total`, a cache with no lock on it, so two avatar renders started
   * together could both read the same balance, both pass, and both dispatch.
   * That was the exact race credit reservation was built to close, just never
   * closed here.
   */
  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: body.projectId,
      user_id: user.id,
      prompt,
      aspect_ratio: "9:16",
      image_urls: [body.imageUrl],
      status: "queued",
      model: model.id,
      trace_id: traceId,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    log("error", "could not record the avatar generation", { traceId });
    return json({ error: "Could not record the generation" }, 500);
  }

  // Nothing is dispatched until the credits are actually held.
  const admin = adminClient();
  const reservation = await reserveCredits(admin, generation.id);
  if (!reservation.held) {
    log("error", "avatar credit reservation refused", { traceId, generationId: generation.id });
    await abandonRun(admin, generation.id, reservation.reason);
    return json({ error: reservation.reason, generationId: generation.id }, reservation.status);
  }

  const callBackUrl = callbackUrl();

  /*
   * Both inputs are handed to the provider as bytes rather than as links to
   * our own storage, for the reason set out in `handToProvider`: a signed link
   * is unreachable in local development and expires in production.
   */
  let imageUrl: string;
  let audioUrl: string;
  try {
    imageUrl = body.imagePath
      ? await handToProvider(supabase, "uploads", body.imagePath, traceId)
      : (body.imageUrl as string);
    audioUrl = body.audioPath
      ? await handToProvider(supabase, "uploads", body.audioPath, traceId)
      : (body.audioUrl as string);
  } catch (error) {
    log("error", "could not hand the avatar inputs to the provider", { traceId });
    const message = error instanceof Error ? error.message : "Could not prepare the inputs";
    await abandonRun(admin, generation.id, message);
    return json({ error: message, generationId: generation.id }, 502);
  }

  let taskId: string;
  try {
    taskId = await createAvatarTask({
      model: model.id,
      resolution: RESOLUTION[model.id],
      imageUrl,
      audioUrl,
      prompt,
      callBackUrl,
    });
  } catch (error) {
    log("error", "avatar task failed", { traceId });
    const message = error instanceof Error ? error.message : "Generation failed";
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
    log("error", "could not record the dispatched avatar task", { traceId, taskId });
    await abandonRun(admin, generation.id, "Could not follow this render");
    return json({ error: "Could not record the generation", generationId: generation.id }, 500);
  }

  log("info", "avatar submitted", { traceId, taskId, generationId: generation.id });
  return json({ generationId: generation.id, taskId });
});
