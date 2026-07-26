"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/** Account changes the owner can make about themselves. */

export type SettingsResult =
  { status: "ok"; message: string } | { status: "error"; message: string };

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(80),
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<SettingsResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check that name" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to change this" };

  // RLS restricts the update to the owner's own row, so the id filter is
  // belt-and-braces rather than the actual protection.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);

  if (error) {
    logger.error("profile update failed", { error: error.message });
    return { status: "error", message: "Could not save that just now" };
  }

  revalidatePath("/dashboard/settings/account");
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
 * Changes the password.
 *
 * Supabase requires a live session for this, which is what stops a stolen tab
 * from being used to lock the real owner out without knowing anything.
 */
export async function updatePassword(
  input: z.input<typeof passwordSchema>,
): Promise<SettingsResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check those passwords" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    // Supabase's own message is useful here (too short, previously used), so it
    // is passed through rather than flattened to a generic failure.
    return { status: "error", message: error.message };
  }
  return { status: "ok", message: "Password changed." };
}
