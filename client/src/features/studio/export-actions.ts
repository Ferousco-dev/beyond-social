"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { postResponse, slotsResponse } from "@/lib/go-api/schemas";

export type PostExportResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string; readonly code?: string };

const postSchema = z.object({
  mediaId: z.string().uuid(),
  platform: z.enum(["youtube", "tiktok", "instagram"]),
  caption: z.string().trim().max(2200),
  title: z.string().trim().max(100).optional(),
  /** An instant (UTC). The browser works it out from the user's zone, never the server. */
  at: z.string().datetime().optional(),
  idempotencyKey: z.string().min(8).max(64),
});

/** Posts an uploaded export now, or at the given instant. */
export async function postExport(input: z.input<typeof postSchema>): Promise<PostExportResult> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the platform, caption and time." };
  const { idempotencyKey, mediaId, ...rest } = parsed.data;
  const result = await goApi("/api/v1/posts", postResponse, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: { ...rest, media_id: mediaId },
  });
  if (!result.ok) {
    const message = result.code === "not_connected" ? "Connect that account first, under Connections." : result.message;
    return { ok: false, message, code: result.code };
  }
  revalidatePath("/dashboard/schedule");
  return { ok: true };
}

/** The words for one platform, as our AI wrote them; every one stays editable. */
export interface PlatformWords {
  readonly title: string;
  readonly caption: string;
}

export type CaptionResult = { readonly ok: true; readonly posts: Readonly<Record<string, PlatformWords>> } | { readonly ok: false; readonly message: string };

const postsSchema = z.object({
  data: z.object({ posts: z.record(z.string(), z.object({ title: z.string(), caption: z.string() })) }),
});

/** Asks our AI for each platform's caption and hashtags. Free, capped per hour by the server. */
export async function writeCaption(about: string, platforms: readonly string[]): Promise<CaptionResult> {
  const text = about.trim().slice(0, 4000);
  if (text === "") return { ok: false, message: "Give the video a title first, so the caption has something to say." };
  if (platforms.length === 0) return { ok: false, message: "Choose an account first." };
  const result = await goApi("/api/v1/compose/caption", postsSchema, {
    method: "POST",
    body: { about: text, platforms: platforms.slice(0, 3) },
    timeoutMs: 60_000,
  });
  return result.ok ? { ok: true, posts: result.data.data.posts } : { ok: false, message: result.status === 404 ? "Captions are not available yet. Write your own." : result.message };
}

/** The hours this account's own past posts did best at, in UTC. Empty until there is enough history. */
export async function learnedSlots(platform: string): Promise<readonly { weekday: number; hour: number }[]> {
  const result = await goApi(`/api/v1/insights/slots?platform=${encodeURIComponent(platform)}`, slotsResponse);
  return result.ok ? result.data.data.slots.map((s) => ({ weekday: s.weekday, hour: s.hour })) : [];
}
