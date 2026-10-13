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
