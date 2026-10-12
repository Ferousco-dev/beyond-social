"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { jobResponse } from "@/lib/go-api/schemas";

import { toJobView, type StartResult } from "./types";

/**
 * Starting a video-to-video transformation and reading its status.
 *
 * Both go to the Go API with the signed-in user's token, so ownership is
 * enforced there. The API returns at once with a job; the browser then follows
 * it over the WebSocket, and uses `getVideoJob` to catch up after a reconnect.
 */

const startSchema = z.object({
  videoId: z.string().uuid(),
  prompt: z.string().trim().max(2000),
  /** One per attempt, so a double click or a retried request cannot start two jobs. */
  idempotencyKey: z.string().min(8).max(128),
});

export async function startVideoTransform(input: z.input<typeof startSchema>): Promise<StartResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Check the prompt and try again." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const { videoId, prompt, idempotencyKey } = parsed.data;
  const result = await goApi("/api/v1/jobs/video-transform", jobResponse, {
    method: "POST",
    body: { video_id: videoId, ...(prompt ? { prompt } : {}) },
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return result.ok
    ? { status: "ok", job: toJobView(result.data.data) }
    : { status: "error", message: result.message };
}

export async function getVideoJob(jobId: string): Promise<StartResult> {
  if (!z.string().uuid().safeParse(jobId).success) return { status: "error", message: "Unknown job." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi(`/api/v1/jobs/${jobId}`, jobResponse);
  return result.ok
    ? { status: "ok", job: toJobView(result.data.data) }
    : { status: "error", message: result.message };
}
