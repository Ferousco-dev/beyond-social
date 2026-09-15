"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { toActionResult, type ActionResult } from "./result";

const rotateSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(12, "A secret value must be at least 12 characters"),
  storeValue: z.boolean().default(false),
});

/**
 * Records a rotation and optionally keeps an encrypted copy in Supabase Vault.
 * The value is never returned by the database and never rendered back here.
 */
export async function rotateSecret(input: z.input<typeof rotateSchema>): Promise<ActionResult> {
  const parsed = rotateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_secret_rotate", {
    p_key: parsed.data.key,
    p_value: parsed.data.value,
    p_store_value: parsed.data.storeValue,
  });

  if (!error) revalidatePath("/dashboard/admin/secrets");
  return toActionResult(error);
}

const clearSchema = z.object({ key: z.string().min(1) });

/** Marks a secret as unset and destroys any encrypted copy held for it. */
export async function clearSecret(input: z.input<typeof clearSchema>): Promise<ActionResult> {
  const parsed = clearSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_secret_clear", { p_key: parsed.data.key });

  if (!error) revalidatePath("/dashboard/admin/secrets");
  return toActionResult(error);
}
