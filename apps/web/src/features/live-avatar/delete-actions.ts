"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Reading and erasing the caller's twin.
 *
 * The erase is a thin pass to the edge function, which is where it belongs: it
 * has to reach the provider, and a server action cannot hold the key that talks
 * to one.
 */

export interface TwinSummary {
  readonly trainingStatus: "pending" | "ready" | "failed";
  readonly createdAt: string;
}

export async function getTwin(): Promise<TwinSummary | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("heygen_avatars")
    .select("training_status, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as { training_status: TwinSummary["trainingStatus"]; created_at: string } | null;
  return row ? { trainingStatus: row.training_status, createdAt: row.created_at } : null;
}

export type DeleteResult = { status: "ok" } | { status: "error"; message: string };

/**
 * Erases the twin here and at the provider.
 *
 * A provider refusal is surfaced rather than swallowed. Telling somebody their
 * likeness is gone while it is still trained somewhere else is the one answer
 * this must never give, and it is exactly what a silently-caught error would
 * produce.
 */
export async function deleteTwin(): Promise<DeleteResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Deletion is not configured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to delete your avatar" };

  const { error } = await supabase.functions.invoke("delete-heygen-avatar", { body: {} });
  if (error) {
    logger.warn("could not delete a twin", { error: error.message });
    return {
      status: "error",
      message: "Your avatar could not be deleted just now. Nothing was removed; try again.",
    };
  }

  return { status: "ok" };
}
