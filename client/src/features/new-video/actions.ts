"use server";

import { z } from "zod";

import { attachmentUrl } from "@/features/conversation/media-actions";
import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { jobResponse } from "@/lib/go-api/schemas";

export type AnalysisResult =
  | { readonly status: "ok"; readonly job: { readonly id: string; readonly state: string; readonly stage: string | null; readonly progress: number; readonly analysis: AnalysisContent | null; readonly error: string | null } }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

export interface AnalysisContent {
  readonly summary: string;
  readonly hook: string;
  readonly mood: string;
  readonly style: string;
  readonly pacing: string;
  readonly voiceover: string;
  readonly whyItWorks: string;
  readonly scenes: readonly { readonly visual: string; readonly action: string }[];
}

const analysisContentSchema = z.object({
  summary: z.string().catch(""),
  hook: z.string().catch(""),
  mood: z.string().catch(""),
  style: z.string().catch(""),
  pacing: z.string().catch(""),
  voiceover: z.string().catch(""),
  why_it_works: z.string().catch(""),
  scenes: z
    .array(z.object({ visual: z.string().catch(""), action: z.string().catch("") }).catch({ visual: "", action: "" }))
    .catch([]),
});

function toContent(raw: z.infer<typeof analysisContentSchema>): AnalysisContent {
  return {
    summary: raw.summary,
    hook: raw.hook,
    mood: raw.mood,
    style: raw.style,
    pacing: raw.pacing,
    voiceover: raw.voiceover,
    whyItWorks: raw.why_it_works,
    scenes: raw.scenes,
  };
}

const startSchema = z
  .object({
    url: z.string().trim().max(2000).optional(),
    mediaId: z.string().uuid().optional(),
    notes: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().min(8).max(128),
  })
  .refine((value) => Boolean(value.url) || Boolean(value.mediaId));

/**
 * Queues an analysis and reads its current state, including the result. A
 * previewed link is sent as the stored file it became, so it is not downloaded
 * a second time.
 */
export async function startAnalysis(input: z.input<typeof startSchema>): Promise<AnalysisResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Paste a video link first." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const { url, mediaId, notes, idempotencyKey } = parsed.data;
  const created = await goApi("/api/v1/analyses", jobResponse, {
    method: "POST",
    body: mediaId ? { media_id: mediaId, notes } : { url, notes },
    headers: { "Idempotency-Key": idempotencyKey },
  });
  if (!created.ok) return { status: "error", message: created.message };
  return readAnalysis(created.data.data.id);
}

export async function readAnalysis(jobId: string): Promise<AnalysisResult> {
  if (!z.string().uuid().safeParse(jobId).success) return { status: "error", message: "Unknown analysis." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi(`/api/v1/jobs/${jobId}`, jobResponse);
  if (!result.ok) return { status: "error", message: result.message };
  const job = result.data.data;
  const raw = (job.result ?? {})["analysis"];
  const parsed = raw === undefined ? null : analysisContentSchema.safeParse(raw);
  const content = parsed && parsed.success ? toContent(parsed.data) : null;
  return {
    status: "ok",
    job: {
      id: job.id,
      state: job.status,
      stage: job.stage ?? null,
      progress: job.progress,
      analysis: content,
      error: job.error ?? null,
    },
  };
}

export type LinkPreviewResult =
  | {
      readonly status: "ok";
      readonly job: {
        readonly id: string;
        readonly state: string;
        readonly kind: string | null;
        readonly url: string | null;
        readonly videoUrl: string | null;
        readonly mediaId: string | null;
        readonly error: string | null;
      };
    }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

const previewResultSchema = z.object({
  kind: z.string().optional(),
  url: z.string().optional(),
  media_id: z.string().uuid().optional(),
});

/** Starts downloading a pasted link so it can be watched before it is analysed. */
export async function startLinkPreview(input: { url: string; idempotencyKey: string }): Promise<LinkPreviewResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Paste a video link first." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const created = await goApi("/api/v1/analyses/previews", jobResponse, {
    method: "POST",
    body: { url: parsed.data.url },
    headers: { "Idempotency-Key": parsed.data.idempotencyKey },
  });
  if (!created.ok) return { status: "error", message: created.message };
  return readLinkPreview(created.data.data.id);
}

export async function readLinkPreview(jobId: string): Promise<LinkPreviewResult> {
  if (!z.string().uuid().safeParse(jobId).success) return { status: "error", message: "Unknown preview." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi(`/api/v1/jobs/${jobId}`, jobResponse);
  if (!result.ok) return { status: "error", message: result.message };
  const job = result.data.data;
  const parsed = previewResultSchema.safeParse(job.result ?? {});
  const stored = parsed.success ? parsed.data : {};
  return {
    status: "ok",
    job: {
      id: job.id,
      state: job.status,
      kind: stored.kind ?? null,
      url: stored.url ?? null,
      mediaId: stored.media_id ?? null,
      videoUrl: stored.media_id ? await attachmentUrl(stored.media_id) : null,
      error: job.error ?? null,
    },
  };
}
