// Typed client for the kie.ai Veo video-generation API.
// Docs: https://docs.kie.ai/veo3-api/generate-veo-3-video
const KIE_BASE = "https://api.kie.ai/api/v1";

function apiKey(): string {
  const key = Deno.env.get("KIE_API_KEY");
  if (!key) throw new Error("KIE_API_KEY is not set");
  return key;
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
  return {
    successFlag: Number(data.successFlag ?? 0),
    resultUrls: parseUrls(data.resultUrls),
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
