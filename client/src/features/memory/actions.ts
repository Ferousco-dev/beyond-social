"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Forgetting on request.
 *
 * A real delete, not a flag. Retiring a memory is what happens when a later
 * claim replaces it, and that is a record worth keeping; being asked to forget
 * something is not the same act and must not leave the sentence in the table.
 *
 * Row-level security scopes both of these to the caller, which is what makes
 * them safe rather than a `user_id` filter that a later edit could drop.
 */

const idSchema = z.object({ id: z.string().uuid() });

export type ForgetResult = { ok: true } | { ok: false; message: string };

export async function forgetFact(input: z.input<typeof idSchema>): Promise<ForgetResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Nothing to forget." };
  if (!isSupabaseConfigured) return { ok: false, message: "Not connected." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_memories").delete().eq("id", parsed.data.id);

  if (error) {
    logger.warn("could not forget a memory", { error: error.message });
    return { ok: false, message: "Could not remove that just now." };
  }

  revalidatePath("/dashboard/settings/memory");
  return { ok: true };
}

/**
 * Clears the lot.
 *
 * Offered because the alternative is deleting forty rows one at a time, which is
 * not a real choice. The confirmation lives in the interface; by the time this
 * runs the decision has been made.
 */
export async function forgetEverything(): Promise<ForgetResult> {
  if (!isSupabaseConfigured) return { ok: false, message: "Not connected." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in again to do that." };

  // Scoped by RLS, and by the filter as well: an unfiltered delete is one
  // policy mistake away from being everybody's.
  const { error } = await supabase.from("user_memories").delete().eq("user_id", user.id);

  if (error) {
    logger.warn("could not clear memories", { error: error.message });
    return { ok: false, message: "Could not clear those just now." };
  }

  revalidatePath("/dashboard/settings/memory");
  return { ok: true };
}
