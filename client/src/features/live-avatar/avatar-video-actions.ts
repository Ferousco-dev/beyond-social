"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { toJobView } from "@/lib/go-api/jobs";
import { avatarResponse, jobResponse, voicesListResponse, type GoVoice } from "@/lib/go-api/schemas";
import { type StartResult } from "@/features/transform/types";

/**
 * Making an avatar speak a script, and choosing which voice it speaks with.
 *
 * Every call goes to the Go API with the signed-in user's token, so avatar and
 * voice ownership are enforced there. The video is a background job: this
 * returns at once and the browser follows it over the WebSocket.
 */

const startSchema = z.object({
  avatarId: z.string().uuid(),
  script: z.string().trim().min(1, "Write what you want to say.").max(3000, "That script is too long."),
  /** One per attempt, so a double click or retried request is one video. */
  idempotencyKey: z.string().min(8).max(128),
});

const quoteResponse = z.object({ data: z.object({ credits: z.number(), seconds: z.number() }) });

export async function quoteAvatarVideoScript(script: string): Promise<number | null> {
  const parsed = z.string().trim().min(1).max(3000).safeParse(script);
  if (!parsed.success || !isGoApiConfigured()) return null;
  const result = await goApi("/api/v1/videos/avatar/quote", quoteResponse, {
    method: "POST",
    body: { script: parsed.data },
  });
  return result.ok ? result.data.data.credits : null;
}

export async function startAvatarVideo(input: z.input<typeof startSchema>): Promise<StartResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the script and try again." };
  }
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const { avatarId, script, idempotencyKey } = parsed.data;
  const result = await goApi("/api/v1/videos/avatar", jobResponse, {
    method: "POST",
    body: { avatar_id: avatarId, script },
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return result.ok
    ? { status: "ok", job: toJobView(result.data.data) }
    : { status: "error", message: result.message };
}

/** Re-reads a video job. Completed videos come back with a fresh file URL. */
export async function getAvatarVideo(jobId: string): Promise<StartResult> {
  if (!z.string().uuid().safeParse(jobId).success) return { status: "error", message: "Unknown video." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi(`/api/v1/videos/${jobId}`, jobResponse);
  return result.ok
    ? { status: "ok", job: toJobView(result.data.data) }
    : { status: "error", message: result.message };
}

export type VoiceListResult =
  | { readonly status: "ok"; readonly voices: readonly GoVoice[] }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

/** The caller's own voices first, then the first page of HeyGen's library. */
export async function listVoices(): Promise<VoiceListResult> {
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi("/api/v1/voices?limit=30&language=English", voicesListResponse);
  return result.ok
    ? { status: "ok", voices: result.data.data }
    : { status: "error", message: result.message };
}

/** Associates a voice with an avatar. The API refuses voices the user may not use. */
export async function selectTwinVoice(
  avatarId: string,
  voiceId: string,
): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  if (!z.string().uuid().safeParse(avatarId).success || voiceId === "") {
    return { status: "error", message: "Choose a voice." };
  }
  if (!isGoApiConfigured()) return { status: "error", message: "Voices are not configured." };

  const result = await goApi(`/api/v1/avatars/${avatarId}/voice`, avatarResponse, {
    method: "POST",
    body: { voice_id: voiceId },
  });
  return result.ok ? { status: "ok" } : { status: "error", message: result.message };
}
