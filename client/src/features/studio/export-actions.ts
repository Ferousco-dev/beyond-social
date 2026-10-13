"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { postResponse } from "@/lib/go-api/schemas";

export type PostExportResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string; readonly code?: string };

const postSchema = z.object({
  mediaId: z.string().uuid(),
  platform: z.enum(["youtube", "tiktok", "instagram"]),
  caption: z.string().trim().max(2200),
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
