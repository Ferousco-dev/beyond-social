// Authenticated endpoint: renders a photo of a person speaking an audio track,
// after checking credits and that the caller has attested the likeness is
// theirs. Records the task the same way a video generation is recorded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { abandonRun, adminClient, reserveCredits } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { callbackUrl } from "../_shared/kie-callback-auth.ts";
import { categoryOf } from "../_shared/kie-errors.ts";
import { createAvatarTask } from "../_shared/kie.ts";
import { generateSpeech, isHeygenConfigured } from "../_shared/heygen.ts";
import {
  buildAvatarInput,
  isAvatarModelSupported,
  UnsupportedModelError,
} from "../_shared/kie-avatars/index.ts";
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
const PLAN_RANK = { free: 0, creator: 1, studio: 2 } as const;

/**
 * What resolution to ask each model for.
 *
 * The provider bills per second and the rate depends on this, so it is not a
 * quality preference but a price. Each model is asked for the tier it is priced
 * at in the catalogue; asking for another would charge the user for something
 * else. The builders below translate this into whatever the provider actually
 * calls the field, since it is not "resolution" for every model.
 */
const RESOLUTION: Record<string, string> = {
  "infinitalk/from-audio": "480p",
  "kling/ai-avatar-standard": "720p",
  "kling/ai-avatar-pro": "1080p",
  "omnihuman-1-5": "1080p",
};

interface AvatarBody {
  projectId?: string;
  prompt?: string;
  imageUrl?: string;
  audioUrl?: string;
  /** Object paths in the uploads bucket. Preferred over the URLs above. */
  imagePath?: string;
  audioPath?: string;
  /**
   * The caller's own cloned voice, from `voice_profiles.provider_voice_id`.
   * Mutually exclusive with audioUrl/audioPath: when set, `prompt` is spoken
   * by HeyGen's text-to-speech rather than lip-synced from a raw clip, and the
   * result is handed to the exact same kie.ai dispatch below either way.
   */
  voiceCloneId?: string;
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
  const usingClonedVoice = Boolean(body.voiceCloneId);
  if (!body.projectId || !prompt || !body.imageUrl) {
    return json({ error: "projectId, prompt and imageUrl are required" }, 400);
  }
  if (!usingClonedVoice && !body.audioUrl) {
    return json({ error: "audioUrl or voiceCloneId is required" }, 400);
  }
  if (usingClonedVoice && body.audioUrl) {
    return json({ error: "provide either audioUrl or voiceCloneId, not both" }, 400);
  }

  /*
   * The cloned voice has to be this caller's own, and actually ready: a
   * `voice_clone_id` off a different row would let one account speak in
   * whatever voice it can guess the id for, and `provider_voice_id` is null
   * until poll-voice-clone has confirmed the clone against HeyGen.
   */
  let clonedVoiceId: string | null = null;
  if (usingClonedVoice) {
    const { data: voiceProfile } = await supabase
      .from("voice_profiles")
      .select("provider_voice_id, clone_status")
      .eq("user_id", user.id)
      .maybeSingle();
    const owned = voiceProfile as { provider_voice_id: string | null; clone_status: string } | null;
    if (
      !owned ||
      owned.clone_status !== "ready" ||
      !owned.provider_voice_id ||
      owned.provider_voice_id !== body.voiceCloneId
    ) {
      return json({ error: "voice_clone_not_ready" }, 403);
    }
    clonedVoiceId = owned.provider_voice_id;
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
    .select("id, is_active, min_plan")
    .eq("id", requested)
    .eq("family", "avatar")
    .maybeSingle();
  if (!model?.is_active) return json({ error: "That avatar model is not available" }, 503);
  const { data: profile } = await supabase.from("profiles").select("plan").maybeSingle();
  const plan = (profile as { plan?: keyof typeof PLAN_RANK } | null)?.plan ?? "free";
  const minimum = model.min_plan as keyof typeof PLAN_RANK;
  if ((PLAN_RANK[plan] ?? PLAN_RANK.free) < (PLAN_RANK[minimum] ?? Number.POSITIVE_INFINITY)) {
    return json({ error: "Your plan does not include that avatar model" }, 403);
  }

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

  /*
   * Deliberate simplification: using an already-cloned voice costs nothing
   * beyond the normal avatar-generation price reserved below. Cloning the
   * voice in the first place is priced separately, in clone-voice
   * (VOICE_CLONE_CREDIT_COST). The owner can revisit charging a premium for
   * a cloned-voice render specifically once real usage shows whether the
   * extra HeyGen text-to-speech call justifies it.
   *
   * Nothing is dispatched until the credits are actually held.
   */
  const admin = adminClient();
  const reservation = await reserveCredits(admin, generation.id);
  if (!reservation.held) {
    log("error", "avatar credit reservation refused", { traceId, generationId: generation.id });
    await abandonRun(
      admin,
      generation.id,
      reservation.reason,
      reservation.status === 402 ? "insufficient_credits" : "internal_error",
    );
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

    if (clonedVoiceId) {
      // Same kie.ai dispatch either way: only where the audio comes from
      // differs. HeyGen's text-to-speech is synchronous, so this simply
      // becomes the `audioUrl` the rest of the function already knows how to
      // hand to kie.
      if (!isHeygenConfigured()) throw new Error("provider_unconfigured");
      const speech = await generateSpeech(clonedVoiceId, prompt);
      if (!speech.audioUrl) throw new Error(speech.error ?? "Could not render that in your voice");
      audioUrl = speech.audioUrl;
    } else {
      audioUrl = body.audioPath
        ? await handToProvider(supabase, "uploads", body.audioPath, traceId)
        : (body.audioUrl as string);
    }
  } catch (error) {
    log("error", "could not hand the avatar inputs to the provider", { traceId });
    const message = error instanceof Error ? error.message : "Could not prepare the inputs";
    await abandonRun(admin, generation.id, message, "internal_error");
    return json({ error: message, generationId: generation.id }, 502);
  }

  /*
   * The provider payload is built per model rather than assembled here.
   *
   * Every avatar model on kie takes an `image_url`, an `audio_url` and a
   * prompt, and they disagree on everything else: kling takes no resolution
   * field (the tier decides it), infinitalk takes `resolution` in `NNNp`, and
   * omnihuman takes `output_resolution` in `NNN`. One assembled shape here got
   * three of them right and dropped omnihuman's silently, which is why the
   * builders live per model beside their documentation.
   */
  if (!isAvatarModelSupported(model.id)) {
    log("error", "avatar model has no dispatcher", { traceId, model: model.id });
    await abandonRun(admin, generation.id, "That avatar model cannot be dispatched", "unsupported_operation");
    return json({ error: "unsupported_model", generationId: generation.id }, 503);
  }

  let taskId: string;
  try {
    const providerInput = buildAvatarInput(model.id, {
      imageUrl,
      audioUrl,
      prompt,
      resolution: RESOLUTION[model.id] ?? "1080p",
    });
    taskId = await createAvatarTask({
      model: model.id,
      input: providerInput,
      callBackUrl,
    });
  } catch (error) {
    log("error", "avatar task failed", { traceId });
    if (error instanceof UnsupportedModelError) {
      await abandonRun(admin, generation.id, error.message, "unsupported_operation");
      return json({ error: error.message, generationId: generation.id }, 400);
    }
    const message = error instanceof Error ? error.message : "Generation failed";
    await abandonRun(admin, generation.id, message, categoryOf(error));
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
    await abandonRun(admin, generation.id, "Could not follow this render", "internal_error");
    return json({ error: "Could not record the generation", generationId: generation.id }, 500);
  }

  log("info", "avatar submitted", { traceId, taskId, generationId: generation.id });
  return json({ generationId: generation.id, taskId });
});
