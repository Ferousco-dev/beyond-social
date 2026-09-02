// Typed client for HeyGen's v3 avatar API.
//
// Docs, read 2026-09-01 rather than recalled:
//   POST /v3/avatars                        https://developers.heygen.com/reference/create-avatar
//   GET  /v3/avatars/{group_id}             https://developers.heygen.com/reference/get-avatar-group
//   POST /v3/videos                         https://developers.heygen.com/reference/create-video
//   GET  /v3/videos/{video_id}              https://developers.heygen.com/reference/get-video
//   DELETE /v3/avatars/{group_id}          https://developers.heygen.com/reference/delete-avatar-group
//   POST /v3/avatars/{group_id}/consent     https://developers.heygen.com/reference/create-avatar-consent
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
 * app already uses for Firebase and for the video models priced at a guess.
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
  readonly error: string | null;
}

interface CreateAvatarResponse {
  data?: {
    avatar_item?: { id?: string; status?: string; error?: unknown } | null;
    avatar_group?: { id?: string; status?: string; error?: unknown } | null;
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
  };
}

export interface HeygenConsentResult {
  readonly consentStatus: string | null;
  /** Present when HeyGen wants the person to complete consent on its own page. */
  readonly url: string | null;
}

/**
 * Registers consent for a private avatar, which HeyGen requires before the
 * avatar may be used to generate anything.
 *
 * The recording this app already takes opens with the consent statement read
 * aloud, so the same footage satisfies both sides: ours, as the attestation on
 * the `heygen_avatars` row, and theirs, as `consent_video`. Passing it means
 * nobody is sent to a second provider page to say the same sentence twice.
 */
export async function submitConsent(
  groupId: string,
  consentVideo: HeygenFile,
  idempotencyKey?: string,
): Promise<HeygenConsentResult> {
  const body = await call<{
    data?: { avatar_group?: { consent_status?: string | null } | null; url?: string | null };
  }>(`/avatars/${encodeURIComponent(groupId)}/consent`, {
    method: "POST",
    // Consent submitted twice for one group is the same consent, and the
    // retry that causes it is a network blip rather than a second decision.
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
    body: JSON.stringify({ consent_video: consentVideo }),
  });

  return {
    consentStatus: body.data?.avatar_group?.consent_status ?? null,
    url: body.data?.url ?? null,
  };
}

export interface HeygenVideoRequest {
  /** The look, not the group: a video is generated from an appearance. */
  readonly avatarId: string;
  readonly voiceId: string;
  readonly script: string;
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
