"use server";

import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logger";
import {
  hasProfileImageSignature,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_MIME_TYPES,
} from "@/lib/settings/profile-image";
import { createClient } from "@/lib/supabase/server";

import { type SettingsResult } from "./actions";

const BUCKET = "profile-avatars";

function refreshProfileViews(): void {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/account");
}

export async function updateProfileImage(formData: FormData): Promise<SettingsResult> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image first" };
  }
  if (!PROFILE_IMAGE_MIME_TYPES.has(file.type) || file.size > PROFILE_IMAGE_MAX_BYTES) {
    return { status: "error", message: "Use a JPG, PNG, or WebP image up to 5MB" };
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasProfileImageSignature(file.type, bytes)) {
    return { status: "error", message: "That file does not match its image format" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to change your photo" };

  const path = `${user.id}/avatar`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) {
    logger.warn("profile image upload failed", { error: uploadError.message });
    return { status: "error", message: "Could not upload that image" };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", user.id);
  if (profileError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { status: "error", message: "Could not save that image" };
  }

  refreshProfileViews();
  return { status: "ok", message: "Profile image updated." };
}

export async function removeProfileImage(): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to remove your photo" };

  const { data } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const path = data?.avatar_url;
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) return { status: "error", message: "Could not remove that image" };
  if (path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
    if (storageError)
      logger.warn("profile image object left behind", { error: storageError.message });
  }

  refreshProfileViews();
  return { status: "ok", message: "Profile image removed." };
}
