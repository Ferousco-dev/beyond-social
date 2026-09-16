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
  readonly id: string;
  readonly name: string | null;
  readonly trainingStatus: "pending" | "ready" | "failed";
  readonly isDefault: boolean;
  readonly createdAt: string;
  readonly error: string | null;
  /**
   * HeyGen's hosted consent page for this row, when training is waiting on
   * it. Without this a pending avatar and one waiting on a step nobody can
   * see look identical, which is what "stuck at pending" reports usually are.
   */
  readonly consentUrl: string | null;
  readonly consentUrlExpired: boolean;
}

/** Everything this person has recorded, newest first, default first of all. */
export async function listTwins(): Promise<readonly TwinSummary[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("heygen_avatars")
    .select(
      "id, name, training_status, is_default, created_at, provider_error, provider_consent_url, provider_consent_url_expires_at",
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as {
    id: string;
    name: string | null;
    training_status: TwinSummary["trainingStatus"];
    is_default: boolean;
    created_at: string;
    provider_error: string | null;
    provider_consent_url: string | null;
    provider_consent_url_expires_at: string | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    trainingStatus: row.training_status,
    isDefault: row.is_default,
    createdAt: row.created_at,
    error: row.provider_error,
    consentUrl: row.provider_consent_url,
    consentUrlExpired: row.provider_consent_url_expires_at
      ? Date.parse(row.provider_consent_url_expires_at) <= Date.now()
      : false,
  }));
}

export type DeleteResult = { status: "ok" } | { status: "error"; message: string };

/**
 * Erases one avatar, here and at the provider.
 *
 * A provider refusal is surfaced rather than swallowed. Telling somebody their
 * likeness is gone while it is still trained somewhere else is the one answer
 * this must never give.
 */
export async function deleteTwin(avatarId: string): Promise<DeleteResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Deletion is not configured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to delete your avatar" };

  const { error } = await supabase.functions.invoke("delete-heygen-avatar", {
    body: { avatarId },
  });
  if (error) {
    logger.warn("could not delete a twin", { error: error.message });
    return {
      status: "error",
      message: "Your avatar could not be deleted just now. Nothing was removed; try again.",
    };
  }

  return { status: "ok" };
}

/** Chooses which avatar speaks when a generation does not name one. */
export async function makeDefaultTwin(avatarId: string): Promise<DeleteResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Not configured" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_default_avatar", { p_avatar: avatarId });
  if (error || data !== true) {
    return { status: "error", message: "That avatar could not be made the default." };
  }
  return { status: "ok" };
}
