"use server";

import { goApi } from "@/lib/go-api/client";
import { avatarsListResponse, type GoAvatar } from "@/lib/go-api/schemas";

export type AvatarChoice = Pick<GoAvatar, "id" | "name" | "is_default" | "voice_id" | "preview_image_url">;

/** The user's avatars that can speak right now: trained, and with a voice. */
export async function listSpeakingAvatars(): Promise<readonly AvatarChoice[]> {
  const result = await goApi("/api/v1/avatars", avatarsListResponse);
  if (!result.ok) return [];
  return result.data.data
    .filter((a) => a.status === "ready" && Boolean(a.voice_id))
    .map(({ id, name, is_default, voice_id, preview_image_url }) => ({ id, name, is_default, voice_id, preview_image_url }));
}
