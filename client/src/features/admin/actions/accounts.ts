"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { toActionResult, type ActionResult } from "./result";

const restoreSchema = z.object({ userId: z.string().uuid() });

/** Restores a deleted account, the counterpart to the deletion the audit log already recorded. */
export async function restoreAccount(input: z.input<typeof restoreSchema>): Promise<ActionResult> {
  const parsed = restoreSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_restore_account", { p_user: parsed.data.userId });

  if (!error) {
    revalidatePath("/dashboard/admin/deleted-accounts");
    revalidatePath("/dashboard/admin/users");
    revalidatePath(`/dashboard/admin/users/${parsed.data.userId}`);
  }
  return toActionResult(error);
}
