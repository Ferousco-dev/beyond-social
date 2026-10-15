"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { postResponse } from "@/lib/go-api/schemas";

export type LibraryResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

const idSchema = z.string().uuid();

/** Removes a video from the library. The video itself and what it cost are untouched. */
export async function removeFromLibrary(id: string): Promise<LibraryResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Unknown video." };
  const result = await goApi(`/api/v1/library/${id}`, z.unknown(), { method: "DELETE" });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/dashboard/library");
  return { ok: true };
}

const postSchema = z.object({
  jobId: idSchema,
  platform: z.enum(["youtube", "tiktok", "instagram"]),
  title: z.string().trim().max(100).default(""),
  caption: z.string().trim().max(2200),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
  at: z.string().datetime().optional(),
  idempotencyKey: z.string().min(8).max(64),
});

/** Posts a library video now, or at a chosen time. */
export async function postFromLibrary(input: z.input<typeof postSchema>): Promise<LibraryResult> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the platform, caption and time." };
  const { idempotencyKey, jobId, ...rest } = parsed.data;
  const result = await goApi("/api/v1/posts", postResponse, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: { ...rest, job_id: jobId },
  });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/dashboard/schedule");
  return { ok: true };
}
