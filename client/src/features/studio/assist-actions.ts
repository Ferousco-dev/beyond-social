"use server";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { jobResponse, wordsResponse } from "@/lib/go-api/schemas";

import { operationSchema, type Operation } from "./core/assist.ts";
import { type SpokenWord } from "./core/captions.ts";

export type AssistResult =
  | { readonly ok: true; readonly reply: string; readonly operations: readonly Operation[]; readonly remember: string }
  | { readonly ok: false; readonly message: string; readonly code?: string };

export type TranscribeResult =
  | { readonly ok: true; readonly words: readonly SpokenWord[] }
  | { readonly ok: false; readonly message: string; readonly code?: string };

const askSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1000) })).max(10),
  state: z.string().max(24_000),
  projectId: z.string().uuid().optional(),
});

const assistResponse = z.object({ data: z.object({ reply: z.string(), operations: z.array(operationSchema), remember: z.string() }) });

export async function askAssistant(input: z.input<typeof askSchema>): Promise<AssistResult> {
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Write a short message to the assistant." };
  const result = await goApi("/api/v1/editor/assist", assistResponse, { method: "POST", body: { message: parsed.data.message, history: parsed.data.history, state: parsed.data.state, project_id: parsed.data.projectId } });
  if (!result.ok) return { ok: false, message: result.message, code: result.code };
  return { ok: true, reply: result.data.data.reply, operations: result.data.data.operations, remember: result.data.data.remember };
}

const urlSchema = z.string().url().startsWith("https://");

/** Listens to a video's speech and returns each word with its time. Costs credits. */
export async function transcribeVideo(url: string): Promise<TranscribeResult> {
  if (!urlSchema.safeParse(url).success) return { ok: false, message: "That video cannot be captioned." };
  // Generous: the server downloads the video and Gemini listens to all of it.
  const result = await goApi("/api/v1/editor/transcribe", wordsResponse, { method: "POST", body: { url }, timeoutMs: 120_000 });
  if (!result.ok) return { ok: false, message: result.message, code: result.code };
  return { ok: true, words: result.data.data.words };
}

const notesResponse = z.object({
  data: z.object({
    summary: z.string(),
    speech: z.string(),
    scenes: z.array(z.object({ start: z.number(), end: z.number(), description: z.string() })),
  }),
});

export type WatchResult = { readonly ok: true; readonly notes: string } | { readonly ok: false; readonly message: string; readonly code?: string };

/** Has the assistant watch one video, and returns what it saw as plain text. Costs credits. */
export async function watchClip(url: string): Promise<WatchResult> {
  if (!urlSchema.safeParse(url).success) return { ok: false, message: "That clip cannot be watched yet." };
  const result = await goApi("/api/v1/editor/watch", notesResponse, { method: "POST", body: { url }, timeoutMs: 120_000 });
  if (!result.ok) return { ok: false, message: result.message, code: result.code };
  const { summary, speech, scenes } = result.data.data;
  const lines = scenes.map((s) => `${s.start.toFixed(1)}-${s.end.toFixed(1)}s: ${s.description}`);
  return { ok: true, notes: [summary, ...lines, speech ? `Said: ${speech}` : ""].filter(Boolean).join("\n") };
}

const quoteResponse = z.object({ data: z.object({ credits: z.number() }) });

export async function quoteScene(seconds: number): Promise<number | null> {
  const result = await goApi(`/api/v1/editor/scenes/quote?seconds=${Math.round(seconds)}`, quoteResponse);
  return result.ok ? result.data.data.credits : null;
}

const sceneSchema = z.object({ prompt: z.string().trim().min(1).max(2500), seconds: z.number().int().min(3).max(15), key: z.string().min(8).max(64) });

export type SceneStart = { readonly ok: true; readonly jobId: string } | { readonly ok: false; readonly message: string; readonly code?: string };

/** Starts making a new scene. This spends the user's credits, so it only runs after they confirm. */
export async function startScene(input: z.input<typeof sceneSchema>): Promise<SceneStart> {
  const parsed = sceneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Describe the scene in a sentence or two." };
  const { key, ...body } = parsed.data;
  const result = await goApi("/api/v1/editor/scenes", jobResponse, { method: "POST", headers: { "Idempotency-Key": key }, body: { ...body, aspect_ratio: "9:16" } });
  return result.ok ? { ok: true, jobId: result.data.data.id } : { ok: false, message: result.message, code: result.code };
}

export type SceneStatus =
  | { readonly state: "working" }
  | { readonly state: "done"; readonly url: string; readonly seconds: number | null }
  | { readonly state: "failed"; readonly message: string };

export async function sceneStatus(jobId: string): Promise<SceneStatus> {
  if (!z.string().uuid().safeParse(jobId).success) return { state: "failed", message: "Unknown scene." };
  const result = await goApi(`/api/v1/jobs/${jobId}`, jobResponse);
  if (!result.ok) return { state: "working" };
  const job = result.data.data;
  if (job.status === "failed") return { state: "failed", message: job.error ?? "The scene could not be made. Your credits were returned." };
  const url = job.result?.["video_url"];
  const seconds = job.result?.["duration_seconds"];
  return job.status === "completed" && typeof url === "string"
    ? { state: "done", url, seconds: typeof seconds === "number" && seconds > 0 ? seconds : null }
    : { state: "working" };
}

const adoptResponse = z.object({ data: z.object({ id: z.string() }) });

export type AdoptResult = { readonly ok: true; readonly mediaId: string } | { readonly ok: false; readonly message: string; readonly code?: string };

/**
 * Copies a finished video into the user's own storage so the editor can read
 * and export it. Providers' links expire and are not meant for other sites.
 */
export async function adoptVideo(jobId: string): Promise<AdoptResult> {
  if (!z.string().uuid().safeParse(jobId).success) return { ok: false, message: "Unknown video." };
  const result = await goApi(`/api/v1/library/${jobId}/adopt`, adoptResponse, { method: "POST", timeoutMs: 180_000 });
  return result.ok ? { ok: true, mediaId: result.data.data.id } : { ok: false, message: result.message, code: result.code };
}
