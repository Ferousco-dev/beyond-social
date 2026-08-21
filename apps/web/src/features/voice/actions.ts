"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const VOICE_CONSENT_VERSION = 1;

const enrollSchema = z.object({
  path: z.string().min(1),
  phrase: z.string().trim().min(1).max(500),
});

export interface VoiceProfile {
  readonly id: string;
  readonly storagePath: string;
  readonly phrase: string;
  readonly url: string | null;
  readonly createdAt: string;
}

export type EnrollResult =
  | { status: "ok"; profile: VoiceProfile }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export type ProfileResult =
  | { status: "ok"; profile: VoiceProfile }
  | { status: "none" }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export type DeleteResult =
  { status: "ok" } | { status: "unconfigured" } | { status: "error"; message: string };

const SIGNED_URL_TTL = 2 * 60 * 60;

async function signVoicePath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
): Promise<string | null> {
  const { data } = await supabase.storage.from("uploads").createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export async function enrollVoice(input: z.input<typeof enrollSchema>): Promise<EnrollResult> {
  const parsed = enrollSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again" };

  if (!parsed.data.path.startsWith(`${user.id}/`)) {
    return { status: "error", message: "That clip could not be saved" };
  }

  const row = {
    user_id: user.id,
    storage_path: parsed.data.path,
    phrase: parsed.data.phrase,
    consent_version: VOICE_CONSENT_VERSION,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("voice_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let profile: { id: string; storage_path: string; phrase: string; created_at: string } | null;

  if (existing) {
    const { data, error } = await supabase
      .from("voice_profiles")
      .update(row)
      .eq("id", existing.id)
      .select("id, storage_path, phrase, created_at")
      .single();
    if (error) {
      logger.error("could not update voice profile", { error: error.message });
      return { status: "error", message: "Could not save that voice" };
    }
    profile = data as typeof profile;
  } else {
    const { data, error } = await supabase
      .from("voice_profiles")
      .insert(row)
      .select("id, storage_path, phrase, created_at")
      .single();
    if (error) {
      logger.error("could not create voice profile", { error: error.message });
      return { status: "error", message: "Could not save that voice" };
    }
    profile = data as typeof profile;
  }

  if (!profile) return { status: "error", message: "Could not save that voice" };

  const url = await signVoicePath(supabase, profile.storage_path);

  revalidatePath("/dashboard/assets");
  return {
    status: "ok",
    profile: {
      id: profile.id,
      storagePath: profile.storage_path,
      phrase: profile.phrase,
      url,
      createdAt: profile.created_at,
    },
  };
}

export async function getVoiceProfile(): Promise<ProfileResult> {
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again" };

  const { data, error } = await supabase
    .from("voice_profiles")
    .select("id, storage_path, phrase, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("could not read voice profile", { error: error.message });
    return { status: "error", message: "Could not load your voice" };
  }

  const row = data as {
    id: string;
    storage_path: string;
    phrase: string;
    created_at: string;
  } | null;
  if (!row) return { status: "none" };

  const url = await signVoicePath(supabase, row.storage_path);

  return {
    status: "ok",
    profile: {
      id: row.id,
      storagePath: row.storage_path,
      phrase: row.phrase,
      url,
      createdAt: row.created_at,
    },
  };
}

export async function deleteVoiceProfile(): Promise<DeleteResult> {
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again" };

  const { data } = await supabase
    .from("voice_profiles")
    .select("storage_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as { storage_path: string } | null;
  if (row) {
    // The row goes regardless of whether the object does: an orphaned clip is
    // findable and cheap, the same call `removeBrandAsset` makes for a saved
    // picture, and it is the row that says whether this account has a voice on
    // file. This used to drop the result silently; a failure here now at least
    // reaches the log, matching every other action that removes storage.
    const { error: storageError } = await supabase.storage.from("uploads").remove([row.storage_path]);
    if (storageError) logger.warn("voice clip left behind", { error: storageError.message });
    await supabase.from("voice_profiles").delete().eq("user_id", user.id);
  }

  revalidatePath("/dashboard/assets");
  return { status: "ok" };
}
