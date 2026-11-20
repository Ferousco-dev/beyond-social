"use server";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { jobResponse } from "@/lib/go-api/schemas";
import { resolveMediaUrls } from "@/features/studio/media-actions";

const textSchema = z.string().trim().min(1).max(5000);
const idSchema = z.string().uuid();
const adoptResponse = z.object({ data: z.object({ id: z.string() }) });

export type VoiceoverStart = { readonly ok: true; readonly jobId: string } | { readonly ok: false; readonly message: string; readonly code?: string };

/** Reads the whole script aloud in one voice. One request for the whole video is what keeps the voice from changing. */
export async function startVoiceover(input: { text: string; key: string; voice?: string }): Promise<VoiceoverStart> {
  const text = textSchema.safeParse(input.text);
  if (!text.success || input.key.length < 8 || input.key.length > 64) return { ok: false, message: "Write what is said in the storyboard first. A voiceover holds up to 5,000 characters." };
  const result = await goApi("/api/v1/voiceover", jobResponse, { method: "POST", headers: { "Idempotency-Key": input.key }, body: { text: text.data, ...(input.voice ? { voice: input.voice } : {}) } });
  return result.ok ? { ok: true, jobId: result.data.data.id } : { ok: false, message: result.message, code: result.code };
}

export type VoiceoverStatus =
  | { readonly state: "working" }
  | { readonly state: "done" }
  | { readonly state: "failed"; readonly message: string }
  | { readonly state: "error"; readonly message: string };

export async function voiceoverStatus(jobId: string): Promise<VoiceoverStatus> {
  if (!idSchema.safeParse(jobId).success) return { state: "failed", message: "That voiceover could not be found." };
  const result = await goApi(`/api/v1/jobs/${jobId}`, jobResponse);
  if (!result.ok) return { state: "error", message: result.message };
  const job = result.data.data;
  if (job.status === "failed") return { state: "failed", message: job.error ?? "The voiceover could not be made. Your credits were returned." };
  return job.status === "completed" && typeof job.result?.["audio_url"] === "string" ? { state: "done" } : { state: "working" };
}

export type VoiceoverAdopted =
  | { readonly ok: true; readonly mediaId: string; readonly url: string | null }
  | { readonly ok: false; readonly message: string; readonly code?: string };

/** Copies the finished recording into the person's own storage, and returns a link to play it. */
export async function adoptVoiceover(jobId: string): Promise<VoiceoverAdopted> {
  if (!idSchema.safeParse(jobId).success) return { ok: false, message: "That voiceover could not be found." };
  const result = await goApi(`/api/v1/voiceover/${jobId}/adopt`, adoptResponse, { method: "POST", timeoutMs: 120_000 });
  if (!result.ok) return { ok: false, message: result.message, code: result.code };
  const mediaId = result.data.data.id;
  const links = await resolveMediaUrls([mediaId]);
  return { ok: true, mediaId, url: links[mediaId]?.url ?? null };
}

/** A fresh playable link for a voiceover already made, since links expire. */
export async function voiceoverLink(mediaId: string): Promise<string | null> {
  if (!idSchema.safeParse(mediaId).success) return null;
  const links = await resolveMediaUrls([mediaId]);
  return links[mediaId]?.url ?? null;
}
