// Typed client for HeyGen's v3 avatar API.
//
// Docs, read 2026-09-15 rather than recalled:
//   POST /v3/avatars                        https://developers.heygen.com/reference/create-avatar
//   GET  /v3/avatars/{group_id}             https://developers.heygen.com/reference/get-avatar-group
//   GET  /v3/avatars/looks/{look_id}        https://developers.heygen.com/reference/get-avatar-look
//   POST /v3/videos                         https://developers.heygen.com/reference/create-video
//   GET  /v3/videos/{video_id}              https://developers.heygen.com/reference/get-video
//   DELETE /v3/avatars/{group_id}          https://developers.heygen.com/reference/delete-avatar-group
//   POST /v3/avatars/{group_id}/consent     https://developers.heygen.com/reference/create-avatar-consent
//   POST /v3/voices/clone                   https://developers.heygen.com/reference/clone-voice
//   GET  /v3/voices/{voice_clone_id}        https://developers.heygen.com/reference/get-voice
//   POST /v3/voices/speech                  https://developers.heygen.com/reference/text-to-speech
//
// Separate from `kie.ts` on purpose. kie renders a video from a photo and an
// audio clip and is done; HeyGen trains a persistent likeness that outlives any
// one render, has its own consent record, and is billed on a different model.
// Threading a provider switch through one client would mean every caller
// carrying the differences.

const HEYGEN_BASE = "https://api.heygen.com/v3";

/**
 * Whether this deployment can talk to HeyGen at all.
 *
 * Every caller checks this first and no-ops when it is false, so the avatar
 * path ships and stays inert until a key exists rather than failing loudly on
 * an environment that was never meant to reach a provider. Same pattern the
 * app already uses for the video models priced at a guess.
 */
export function isHeygenConfigured(): boolean {
  return (Deno.env.get("HEYGEN_API_KEY") ?? "") !== "";
}

function apiKey(): string {
  const key = Deno.env.get("HEYGEN_API_KEY");
  if (!key) throw new Error("HEYGEN_API_KEY is not set");
  return key;
}

export class HeygenError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HeygenError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${HEYGEN_BASE}${path}`, {
    ...init,
    headers: {
      // HeyGen accepts a bearer token too, but the key is what an integration
      // holds; using it directly keeps one credential rather than two.
      "x-api-key": apiKey(),
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    // The body carries the reason, and losing it turns "that footage is too
    // short" into "400". Truncated because a provider erroring in HTML should
    // not put a page into a log line.
    throw new HeygenError(response.status, text.slice(0, 500) || response.statusText);
  }
  return JSON.parse(text) as T;
}

/** How the footage is handed over. A URL, because ours already lives in storage. */
export interface HeygenFile {
  readonly type: "url";
  readonly url: string;
}

export interface HeygenAvatarResult {
  /** The look, which is what a later video generation actually names. */
  readonly lookId: string | null;
  /** The character. Consent and training status both hang off this. */
  readonly groupId: string | null;
  readonly status: string | null;
  readonly consentStatus: string | null;
  readonly defaultVoiceId: string | null;
  readonly error: string | null;
}

interface CreateAvatarResponse {
  data?: {
    avatar_item?: {
      id?: string;
      status?: string;
      error?: unknown;
      default_voice_id?: string | null;
    } | null;
    avatar_group?: {
      id?: string;
      status?: string;
      error?: unknown;
      consent_status?: string | null;
      default_voice_id?: string | null;
    } | null;
  };
}

function describeError(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value).slice(0, 300);
}

/**
 * Starts training a digital twin from recorded footage.
 *
 * `digital_twin` is the type that takes video; the other types on this endpoint
 * take a still image or a text prompt and produce something else entirely.
 * Returns as soon as HeyGen accepts the job: training is not synchronous, and
 * the status is read back from the group.
 */
export async function createDigitalTwin(
  name: string,
  file: HeygenFile,
  /**
   * Sent as `Idempotency-Key`, the same header the consent call already uses.
   *
   * Belt and braces rather than the defence itself. HeyGen documents the header
   * for mutation endpoints but not specifically for this one, so the caller's
   * durable dispatch claim is what actually stops a second training job; this
   * only helps if the provider honours it. An unrecognised header is ignored.
   */
  idempotencyKey?: string,
): Promise<HeygenAvatarResult> {
  const body = await call<CreateAvatarResponse>("/avatars", {
    method: "POST",
    body: JSON.stringify({ type: "digital_twin", name, file }),
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
  });

  const item = body.data?.avatar_item ?? null;
  const group = body.data?.avatar_group ?? null;
  return {
    lookId: item?.id ?? null,
    groupId: group?.id ?? null,
    status: item?.status ?? group?.status ?? null,
    consentStatus: group?.consent_status ?? null,
    defaultVoiceId: group?.default_voice_id ?? item?.default_voice_id ?? null,
    error: describeError(item?.error ?? group?.error),
  };
}

/**
 * The group's own fields sit directly on `data`, not under an `avatar_group`
 * key. The create endpoint nests, this one does not, and reading it the same
 * way as create silently produced a null status for every poll.
 */
interface AvatarGroupResponse {
  data?: {
    id?: string;
    status?: string | null;
    consent_status?: string | null;
    default_voice_id?: string | null;
    preview_image_url?: string | null;
    preview_video_url?: string | null;
    error?: { code?: string; message?: string } | null;
  } | null;
}

/** Verbatim from the reference, so a new value fails loudly rather than silently. */
export type HeygenTrainingStatus = "processing" | "pending_consent" | "failed" | "completed";

export interface HeygenGroupStatus {
  readonly status: string | null;
  readonly consentStatus: string | null;
  /** The voice HeyGen assigns the twin. Required to generate anything with it. */
  readonly defaultVoiceId: string | null;
  readonly error: string | null;
  readonly previewImageUrl: string | null;
  readonly previewVideoUrl: string | null;
}

/** Where training has got to. Polled the same way kie jobs are. */
export async function getAvatarGroup(groupId: string): Promise<HeygenGroupStatus> {
  const body = await call<AvatarGroupResponse>(`/avatars/${encodeURIComponent(groupId)}`);
  const group = body.data ?? null;
  return {
    status: group?.status ?? null,
    consentStatus: group?.consent_status ?? null,
    defaultVoiceId: group?.default_voice_id ?? null,
    error: group?.error ? describeError(group.error.message ?? group.error) : null,
    previewImageUrl: group?.preview_image_url ?? null,
    previewVideoUrl: group?.preview_video_url ?? null,
  };
}

export interface HeygenConsentResult {
  readonly consentStatus: string | null;
  /** HeyGen-hosted webcam consent URL for all self-service accounts. */
  readonly url: string | null;
}

/**
 * Starts HeyGen's hosted consent flow for a private avatar.
 *
 * Important: self-service HeyGen API accounts may call this endpoint only in
 * Level 1 mode, by omitting `consent_video`. Uploading a pre-recorded consent
 * video to this endpoint is Enterprise-only and intentionally not represented
 * by this client.
 */
export async function createHostedConsent(
  groupId: string,
  rerouteUrl: string | null,
  idempotencyKey?: string,
): Promise<HeygenConsentResult> {
  const body = await call<{
    data?: { avatar_group?: { consent_status?: string | null } | null; url?: string | null };
  }>(`/avatars/${encodeURIComponent(groupId)}/consent`, {
    method: "POST",
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
    body: JSON.stringify(rerouteUrl ? { reroute_url: rerouteUrl } : {}),
  });

  return {
    consentStatus: body.data?.avatar_group?.consent_status ?? null,
    url: body.data?.url ?? null,
  };
}

interface AvatarLookResponse {
  data?: {
    id?: string;
    status?: string | null;
    default_voice_id?: string | null;
    error?: { code?: string; message?: string } | string | null;
  } | null;
}

export interface HeygenLookStatus {
  readonly status: string | null;
  readonly defaultVoiceId: string | null;
  readonly error: string | null;
}

/** The look is what later video generation names, so its training status gates readiness. */
export async function getAvatarLook(lookId: string): Promise<HeygenLookStatus> {
  const body = await call<AvatarLookResponse>(`/avatars/looks/${encodeURIComponent(lookId)}`);
  const look = body.data ?? null;
  return {
    status: look?.status ?? null,
    defaultVoiceId: look?.default_voice_id ?? null,
    error: look?.error
      ? typeof look.error === "string"
        ? look.error
        : describeError(look.error.message ?? look.error)
      : null,
  };
}

export interface HeygenVideoRequest {
  /** The look, not the group: a video is generated from an appearance. */
  readonly avatarId: string;
  readonly voiceId: string;
  readonly script: string;
  readonly mode?: "script" | "cinematic";
  readonly title?: string;
  /** Where HeyGen posts completion, so this is not polled forever. */
  readonly callbackUrl?: string;
  readonly callbackId?: string;
}

/**
 * Asks for a video of the twin speaking a script.
 *
 * Pinned to Avatar V, the engine the twin is trained for: the older engines
 * accept the same avatar and produce the static head-loop this whole feature
 * exists to move past. 9:16 because everything this product makes is vertical.
 */
export async function createAvatarVideo(request: HeygenVideoRequest): Promise<string> {
  if (request.mode === "cinematic") {
    const body = await call<{ data?: { video_id?: string } }>("/videos", {
      method: "POST",
      body: JSON.stringify({
        type: "cinematic_avatar",
        prompt: request.script,
        avatar_id: [request.avatarId],
        aspect_ratio: "9:16",
        resolution: "1080p",
        duration: 8,
        ...(request.title ? { title: request.title } : {}),
      }),
    });
    const id = body.data?.video_id;
    if (!id) throw new HeygenError(502, "HeyGen accepted the cinematic video but returned no id");
    return id;
  }

  const body = await call<{ data?: { video_id?: string } }>("/videos", {
    method: "POST",
    body: JSON.stringify({
      type: "avatar",
      avatar_id: request.avatarId,
      voice_id: request.voiceId,
      script: request.script,
      engine: { type: "avatar_v" },
      aspect_ratio: "9:16",
      resolution: "1080p",
      output_format: "mp4",
      ...(request.title ? { title: request.title } : {}),
      ...(request.callbackUrl ? { callback_url: request.callbackUrl } : {}),
      ...(request.callbackId ? { callback_id: request.callbackId } : {}),
    }),
  });
  const id = body.data?.video_id;
  if (!id) throw new HeygenError(502, "HeyGen accepted the video but returned no id");
  return id;
}

/** Verbatim from the reference. */
export type HeygenVideoStatus = "pending" | "processing" | "completed" | "failed";

export interface HeygenVideo {
  readonly status: string | null;
  readonly videoUrl: string | null;
  readonly durationSeconds: number | null;
  readonly error: string | null;
}

export async function getVideo(videoId: string): Promise<HeygenVideo> {
  const body = await call<{
    data?: {
      status?: string | null;
      video_url?: string | null;
      duration?: number | null;
      failure_code?: string | null;
      failure_message?: string | null;
    } | null;
  }>(`/videos/${encodeURIComponent(videoId)}`);
  const video = body.data ?? null;
  return {
    status: video?.status ?? null,
    videoUrl: video?.video_url ?? null,
    durationSeconds: video?.duration ?? null,
    // The code alone is not actionable and the message alone loses the class of
    // failure, so a failed video keeps both.
    error: video?.failure_message
      ? `${video.failure_code ?? "failed"}: ${video.failure_message}`
      : (video?.failure_code ?? null),
  };
}

/**
 * Permanently removes a trained twin and every look built from it.
 *
 * HeyGen's own word is "permanently", and it does not say whether the training
 * data behind the group goes with it. That gap is why the retention policy in
 * docs/live-avatar/CONSENT-AND-RETENTION.md treats deletion here as a request
 * we make and record rather than a fact we can assert to the person.
 *
 * A group that is already gone is not an error: deletion is retried, and the
 * second attempt finding nothing means the first one worked.
 */
export async function deleteAvatarGroup(groupId: string): Promise<void> {
  try {
    await call<{ data?: { id?: string } }>(`/avatars/${encodeURIComponent(groupId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (error instanceof HeygenError && error.status === 404) return;
    throw error;
  }
}

export interface HeygenCloneResult {
  readonly voiceCloneId: string | null;
  readonly error: string | null;
}

/**
 * Starts cloning a voice from an enrolled clip.
 *
 * `remove_background_noise` is left at its documented default (true) rather
 * than surfaced: this app records a short, deliberate phrase for enrolment,
 * not arbitrary field audio, so there is no case yet where turning it off is
 * the right call.
 */
export async function cloneVoice(
  name: string,
  file: HeygenFile,
  /** Same idempotency convention as `createDigitalTwin`: belt and braces. */
  idempotencyKey?: string,
): Promise<HeygenCloneResult> {
  const body = await call<{
    data?: { voice_clone_id?: string } | null;
  }>("/voices/clone", {
    method: "POST",
    body: JSON.stringify({ audio: file, voice_name: name }),
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
  });

  // Confirmed against developers.heygen.com/reference/clone-a-voice (read
  // 2026-09-15): `{ data: { voice_clone_id } }`, always nested.
  const id = body.data?.voice_clone_id ?? null;
  return { voiceCloneId: id, error: id ? null : "HeyGen accepted no voice_clone_id" };
}

/**
 * Confirmed against developers.heygen.com/reference/get-voice (read
 * 2026-09-15). `voice_id` and `support_pause` are the only fields the docs
 * call guaranteed; `status` and `failure_message` are read as optional for
 * the same reason `getAvatarGroup` reads its fields optional, not because
 * this one is still a guess.
 */
export type HeygenVoiceCloneStatus = "processing" | "complete" | "failed";

export interface HeygenVoiceClone {
  readonly status: string | null;
  /** Equal to the id polled: the same field GET returns is what POST /voices/speech takes. */
  readonly voiceId: string | null;
  readonly error: string | null;
}

/** Where a submitted clone has got to. */
export async function getVoiceClone(voiceCloneId: string): Promise<HeygenVoiceClone> {
  const body = await call<{
    data?: {
      voice_id?: string | null;
      status?: string | null;
      failure_message?: string | null;
    } | null;
  }>(`/voices/${encodeURIComponent(voiceCloneId)}`);

  const status = body.data?.status ?? null;
  const voiceId = body.data?.voice_id ?? null;
  const error = describeError(body.data?.failure_message);

  if (status === null && voiceId === null && error === null) {
    // Logged rather than thrown: a shape this parser cannot read should not
    // crash the poll loop. Kept as a safety net even though the shape above
    // is now confirmed, the same way this file logs elsewhere for a provider
    // that could still change its response without notice.
    console.error("unrecognised getVoiceClone response shape", JSON.stringify(body).slice(0, 500));
  }

  return { status, voiceId, error };
}

