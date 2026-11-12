"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { jobResponse, jobSchema, type GoJob } from "@/lib/go-api/schemas";

const requestSchema = z.object({
  /** A face and voice picked from the library, or an older asset group. */
  faceAssetId: z.string().uuid().optional(),
  voiceAssetId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  script: z.string().trim().min(1).max(5000),
  prompt: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().min(8).max(128),
}).refine((value) => Boolean(value.groupId) || (Boolean(value.faceAssetId) && Boolean(value.voiceAssetId)));

export type LiveAvatarResult =
  | { readonly status: "ok"; readonly job: GoJob }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

export async function createLiveAvatar(input: z.input<typeof requestSchema>): Promise<LiveAvatarResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Complete the avatar, voice, script and direction first." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi("/api/v1/videos/live-avatar", jobResponse, {
    method: "POST",
    headers: { "Idempotency-Key": parsed.data.idempotencyKey },
    body: {
      ...(parsed.data.faceAssetId ? { face_asset_id: parsed.data.faceAssetId, voice_asset_id: parsed.data.voiceAssetId } : { group_id: parsed.data.groupId }),
      script: parsed.data.script,
      prompt: parsed.data.prompt,
    },
  });
  return result.ok ? { status: "ok", job: result.data.data } : { status: "error", message: result.message };
}

const quoteResponse = z.object({ data: z.object({ credits: z.number(), seconds: z.number() }) });

/**
 * Prices a lip-synced video from the voice recordings that will play: the
 * recordings picked for a talking video or conversation, or one saved group.
 */
export async function quoteLiveAvatar(input: {
  readonly voiceAssetIds?: readonly string[];
  readonly groupId?: string;
}): Promise<number | null> {
  if (!isGoApiConfigured()) return null;
  const query = new URLSearchParams();
  if (input.groupId) query.set("group", input.groupId);
  for (const id of input.voiceAssetIds ?? []) query.append("voice", id);
  const result = await goApi(`/api/v1/videos/live-avatar/quote?${query.toString()}`, quoteResponse);
  return result.ok ? result.data.data.credits : null;
}


const conversationSchema = z.object({
  turns: z
    .array(z.object({ faceAssetId: z.string().uuid(), voiceAssetId: z.string().uuid(), words: z.string().trim().min(1).max(5000) }))
    .min(2)
    .max(6),
  prompt: z.string().trim().max(2000),
  idempotencyKey: z.string().min(8).max(128),
});
const conversationResponse = z.object({ data: z.object({ jobs: z.array(jobSchema), error: z.string().optional() }) });

export type ConversationResult =
  | { readonly status: "ok"; readonly jobs: readonly GoJob[]; readonly warning: string | null }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

/** Starts one lip-synced video per turn; the server checks every turn before any starts. */
export async function createConversation(input: z.input<typeof conversationSchema>): Promise<ConversationResult> {
  const parsed = conversationSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Give every turn a face, a voice and its words. A conversation has 2 to 6 turns." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi("/api/v1/videos/conversation", conversationResponse, {
    method: "POST",
    headers: { "Idempotency-Key": parsed.data.idempotencyKey },
    body: {
      turns: parsed.data.turns.map((turn) => ({ face_asset_id: turn.faceAssetId, voice_asset_id: turn.voiceAssetId, script: turn.words })),
      prompt: parsed.data.prompt,
    },
  });
  return result.ok
    ? { status: "ok", jobs: result.data.data.jobs, warning: result.data.data.error ?? null }
    : { status: "error", message: result.message };
}
