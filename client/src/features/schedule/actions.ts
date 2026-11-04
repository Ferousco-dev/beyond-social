"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { postResponse } from "@/lib/go-api/schemas";

export type CancelResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

/** Stops a post that has not started going out. */
export async function cancelPost(id: string): Promise<CancelResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Unknown post." };
  const result = await goApi(`/api/v1/posts/${id}/cancel`, postResponse, { method: "POST" });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/dashboard/schedule");
  return { ok: true };
}

/** Moves a post that has not started going out to a new time. */
export async function reschedulePost(id: string, at: string): Promise<CancelResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Unknown post." };
  const time = new Date(at);
  if (Number.isNaN(time.getTime())) return { ok: false, message: "Pick a new date and time." };
  const result = await goApi(`/api/v1/posts/${id}`, postResponse, {
    method: "PUT",
    body: { at: time.toISOString() },
  });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/dashboard/schedule");
  return { ok: true };
}
