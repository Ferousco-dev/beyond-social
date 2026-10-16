"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { jobResponse, type GoJob } from "@/lib/go-api/schemas";

const requestSchema = z.object({
  groupId: z.string().uuid(),
  voiceId: z.string().min(1).max(200),
  script: z.string().trim().min(1).max(5000),
  prompt: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().min(8).max(128),
});

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
    body: { group_id: parsed.data.groupId, voice_id: parsed.data.voiceId, script: parsed.data.script, prompt: parsed.data.prompt },
  });
  return result.ok ? { status: "ok", job: result.data.data } : { status: "error", message: result.message };
}

const scriptSchema = z.object({ objective: z.string().trim().min(1).max(500), audience: z.string().trim().min(1).max(500), product: z.string().trim().max(500), style: z.string().trim().max(500) });
const scriptResponse = z.object({ data: z.object({ script: z.string().min(1) }) });

export async function draftLiveAvatarScript(input: z.input<typeof scriptSchema>): Promise<{ readonly status: "ok"; readonly script: string } | { readonly status: "unconfigured" } | { readonly status: "error"; readonly message: string }> {
  const parsed = scriptSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Add an objective and audience before drafting a script." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi("/api/v1/videos/live-avatar/script", scriptResponse, { method: "POST", body: parsed.data });
  return result.ok ? { status: "ok", script: result.data.data.script } : { status: "error", message: result.message };
}
