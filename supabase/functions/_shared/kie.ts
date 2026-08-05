// Typed client for the kie.ai Veo video-generation API.
// Docs: https://docs.kie.ai/veo3-api/generate-veo-3-video
import { buildMarketInput, type Shot } from "./kie-models.ts";

const KIE_BASE = "https://api.kie.ai/api/v1";

function apiKey(): string {
  const key = Deno.env.get("KIE_API_KEY");
  if (!key) throw new Error("KIE_API_KEY is not set");
  return key;
}

/**
 * Hands a reference file to kie as bytes and returns the URL they serve it on.
 *
 * Used for both the photo a render animates and the voice clip it lip-syncs.
 *
 * The alternative is passing a link to our own storage, which is what this
 * replaced, and it fails in two different ways. In local development the link
 * points at 127.0.0.1, so kie fetches its own loopback and rejects the task
 * with "Image fetch failed. Check access settings or use our File Upload API
 * instead." In production the link works but is signed for two hours, so a
 * render that sits in a queue longer than that fails on an expired URL after
 * the credit has already been reserved.
 *
 * Uploading removes both. kie keeps the file for three days, which is longer
 * than any render takes, and our storage never has to be reachable from
 * outside at all.
 *
 * The host is not api.kie.ai and not a typo. kie's own documentation gives
 * `https://api.kie.ai/api/file-base64-upload`, which 404s with a valid key.
 * The live route is on kieai.redpandaai.co, which is what its own
 * `available_apis` list reports, and it returns a tempfile.redpandaai.co URL.
 */
const KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";

export async function uploadFile(bytes: Uint8Array, fileName: string): Promise<string> {
  // Chunked rather than String.fromCharCode(...bytes): spreading a multi-megabyte
  // array as arguments overflows the call stack, which shows up as a render that
  // fails only for large photos.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }

  const response = await fetch(KIE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data: btoa(binary),
      uploadPath: "beyond-social/references",
      fileName,
    }),
  });

  if (!response.ok) throw new Error(`kie upload failed: ${response.status}`);

  const body = (await response.json()) as {
    success?: boolean;
    msg?: string;
    data?: { downloadUrl?: string };
  };
  const url = body.data?.downloadUrl;
  if (!url) throw new Error(`kie upload returned no url: ${body.msg ?? "unknown error"}`);
  return url;
}

export interface KieGenerateInput {
  prompt: string;
  imageUrls?: string[];
  model?: string; // veo3 | veo3_fast | veo3_lite
  aspectRatio?: string; // 16:9 | 9:16 | Auto
  resolution?: string; // 720p | 1080p | 4k
  duration?: number; // 4 | 6 | 8
  callBackUrl?: string;
}

// Create a generation task. Returns immediately with a task id; the video is
// produced asynchronously and delivered via callBackUrl or record-info polling.
export async function createVideoTask(input: KieGenerateInput): Promise<string> {
  const response = await fetch(`${KIE_BASE}/veo/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: input.prompt,
      imageUrls: input.imageUrls,
      model: input.model ?? "veo3_fast",
      aspect_ratio: input.aspectRatio ?? "9:16",
      resolution: input.resolution ?? "720p",
      duration: input.duration ?? 8,
      callBackUrl: input.callBackUrl,
    }),
  });

  const body = await response.json().catch(() => null);
  const taskId = body?.data?.taskId;
  if (!response.ok || body?.code !== 200 || typeof taskId !== "string") {
    throw new Error(`kie.ai generate failed: ${body?.msg ?? response.status}`);
  }
  return taskId;
}

export interface KieExtendInput {
  /** The task that produced the clip being continued. */
  taskId: string;
  /** How the continuation should go. Required by the provider. */
  prompt: string;
  /** `fast` | `quality` | `lite`; defaults to fast at the provider. */
  model?: string;
  callBackUrl?: string;
}

/**
 * Continues a clip the provider already made.
 *
 * Only veo can do this, and only for its own output: the request names a task
 * id rather than a video, so there is no way to hand it a file. Two constraints
 * come with that and both are load-bearing.
 *
 * The first is that a clip generated at 1080p cannot be extended at all, which
 * is why 720p is the default resolution everywhere and why raising it would
 * quietly remove this feature from every video made afterwards.
 *
 * The second is that audio continues but vocals do not, unless the source clip
 * has vocal audio in its final second. Background sound and music carry over;
 * a narration that ends on a pause extends into silence.
 */
export async function extendVideoTask(input: KieExtendInput): Promise<string> {
  const response = await fetch(`${KIE_BASE}/veo/extend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      taskId: input.taskId,
      prompt: input.prompt,
      model: input.model ?? "fast",
      callBackUrl: input.callBackUrl,
    }),
  });

  const body = await response.json().catch(() => null);
  const taskId = body?.data?.taskId;
  if (!response.ok || body?.code !== 200 || typeof taskId !== "string") {
    throw new Error(`kie.ai extend failed: ${body?.msg ?? response.status}`);
  }
  return taskId;
}

export interface KieMarketVideoInput {
  model: string;
  prompt: string;
  /** Stills to animate from, in the order the caller supplied them. */
  imageUrls: readonly string[];
  /** "9:16" | "16:9" | "Auto". */
  aspectRatio: string;
  duration: number;
  /** Beats to cut between; empty for a single continuous take. */
  shots: readonly Shot[];
  callBackUrl?: string;
}

/**
 * Creates a video task on the market endpoint.
 *
 * The veo models are dispatched through `/veo/generate`, which takes its
 * arguments flat. Everything else on this provider, Seedance included, is a
 * market model on `/jobs/createTask`, which names the model in the body and
 * nests its arguments under `input`. Sending a market model to the veo
 * endpoint is rejected outright, which is why this exists rather than another
 * branch inside `createVideoTask`.
 *
 * The arguments themselves are named per model by `buildMarketInput`, because
 * no two market models name them the same way. This function used to send a
 * single `image_url` to all of them, which none of them document: Kling takes
 * `image_urls`, Seedance takes `first_frame_url` and `reference_image_urls`.
 * A provider that ignores an unknown field turns that into a video generated
 * without the reference photo the user attached, at full price.
 */
export async function createMarketVideoTask(input: KieMarketVideoInput): Promise<string> {
  // Throws before the request is made, so a model that cannot be addressed
  // correctly costs nothing rather than failing after the task is created.
  const modelInput = buildMarketInput(input.model, {
    prompt: input.prompt,
    imageUrls: input.imageUrls,
    aspectRatio: input.aspectRatio,
    duration: input.duration,
    shots: input.shots,
  });

  const response = await fetch(`${KIE_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      callBackUrl: input.callBackUrl,
      input: modelInput,
    }),
  });

  const body = await response.json().catch(() => null);
  const taskId = body?.data?.taskId;
  if (!response.ok || body?.code !== 200 || typeof taskId !== "string") {
    throw new Error(`kie.ai market task failed: ${body?.msg ?? response.status}`);
  }
  return taskId;
}

export interface KieAvatarInput {
  /** Which avatar model. All of them take exactly these three inputs. */
  model: string;
  imageUrl: string;
  audioUrl: string;
  prompt: string;
  /** 480p unless asked otherwise: 720p is four times the price. */
  resolution?: string; // 480p | 720p
  callBackUrl?: string;
}

/**
 * Creates a talking-avatar task: a still of a person plus an audio track,
 * rendered as that person speaking it.
 *
 * The model is a parameter because InfiniteTalk and both Kling avatars take
 * the same three inputs through the same endpoint, so supporting all of them
 * is a row in the catalogue rather than a code path each.
 *
 * A different endpoint from `createVideoTask`, and a different request shape:
 * the market models take their arguments nested under `input` and name the
 * model in the body, where the veo endpoint takes them flat. The task id it
 * returns is the same kind of handle, so polling and the callback are shared.
 */
export async function createAvatarTask(input: KieAvatarInput): Promise<string> {
  const response = await fetch(`${KIE_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      callBackUrl: input.callBackUrl,
      input: {
        image_url: input.imageUrl,
        audio_url: input.audioUrl,
        prompt: input.prompt,
        resolution: input.resolution ?? "480p",
      },
    }),
  });

  const body = await response.json().catch(() => null);
  const taskId = body?.data?.taskId;
  if (!response.ok || body?.code !== 200 || typeof taskId !== "string") {
    throw new Error(`kie.ai avatar task failed: ${body?.msg ?? response.status}`);
  }
  return taskId;
}

/**
 * Status for a task created through `jobs/createTask`.
 *
 * Separate from `getRecordInfo` because the market endpoint reports a textual
 * state and returns its output as a JSON-encoded string, where the veo endpoint
 * uses a numeric flag and a nested object. Normalised to the same shape so
 * callers do not have to care which one produced a task.
 */
export async function getJobInfo(taskId: string): Promise<KieRecordInfo> {
  const response = await fetch(`${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  const body = await response.json().catch(() => null);
  const data = body?.data ?? {};
  const state = String(data.state ?? "");

  // `resultJson` is a string holding `{"resultUrls":[...]}`, so it needs
  // decoding before the urls can be read.
  let urls: string[] = [];
  if (typeof data.resultJson === "string" && data.resultJson.length > 0) {
    try {
      urls = parseUrls((JSON.parse(data.resultJson) as { resultUrls?: unknown }).resultUrls);
    } catch {
      urls = [];
    }
  }

  const successFlag = state === "success" ? 1 : state === "fail" ? 2 : 0;
  return { successFlag, resultUrls: urls };
}

export interface KieRecordInfo {
  successFlag: number; // 0 generating, 1 success, 2 | 3 failed
  resultUrls: string[];
}

export async function getRecordInfo(taskId: string): Promise<KieRecordInfo> {
  const response = await fetch(`${KIE_BASE}/veo/record-info?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  const body = await response.json().catch(() => null);
  const data = body?.data ?? {};
  // The flag sits at the top of `data`, but the urls are nested under
  // `data.response`. Reading them from the top level meant a finished render
  // parsed as success with no urls, which fails the length check below and
  // reports "generating" on every poll until the client gives up.
  const result = data.response ?? {};
  return {
    successFlag: Number(data.successFlag ?? 0),
    resultUrls: parseUrls(result.resultUrls ?? result.fullResultUrls ?? data.resultUrls),
  };
}

// kie.ai returns resultUrls as a JSON-encoded array string (occasionally a
// bare string). Normalise both to an array.
export function parseUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [value];
  } catch {
    return [value];
  }
}
