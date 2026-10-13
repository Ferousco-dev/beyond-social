"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { nameResponse } from "@/lib/go-api/schemas";
import { createClient } from "@/lib/supabase/server";

/** Account changes a person makes about themselves. */

export type SettingsResult =
  { status: "ok"; message: string } | { status: "error"; message: string };

const nameSchema = z.object({ fullName: z.string().trim().min(1, "Enter your name").max(80, "Use 80 characters or fewer") });

export async function updateProfile(input: z.input<typeof nameSchema>): Promise<SettingsResult> {
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check that name" };
  }
  const result = await goApi("/api/v1/me", nameResponse, { method: "PATCH", body: { name: parsed.data.fullName } });
  if (!result.ok) return { status: "error", message: result.message };

  // The name is shown by the dashboard shell, not the settings page that changed it.
  revalidatePath("/dashboard", "layout");
  return { status: "ok", message: "Name updated." };
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Those passwords do not match",
    path: ["confirm"],
  });

/**
 * Changes the password. Supabase requires a live session for this, which is what
 * stops a stolen tab from locking the real owner out without knowing anything.
 */
export async function updatePassword(input: z.input<typeof passwordSchema>): Promise<SettingsResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check those passwords" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  // Supabase's own message is useful here (too short, previously used), so it is passed through.
  if (error) return { status: "error", message: error.message };
  return { status: "ok", message: "Password changed." };
}
