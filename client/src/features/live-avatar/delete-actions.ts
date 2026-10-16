"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { avatarResponse, avatarsListResponse, type GoAvatar } from "@/lib/go-api/schemas";

/**
 * Reading and erasing the caller's avatars. All of it is a request to the Go
 * API, which owns the data, the HeyGen account and the deletion rules.
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
  readonly previewImageUrl: string | null;
  readonly previewVideoUrl: string | null;
  /** A short-lived signed URL to the original recording for older twins. */
  readonly recordingUrl: string | null;
  /** Whether the avatar has a voice to speak in. HeyGen clones one from the recording. */
  readonly voiceReady: boolean;
  /** The HeyGen voice this avatar speaks with, when one is chosen. */
  readonly voiceId: string | null;
}

const ownerId = z.string().uuid();

function toSummary(avatar: GoAvatar): TwinSummary {
  return {
    id: avatar.id,
    name: avatar.name,
    trainingStatus: avatar.status === "ready" ? "ready" : avatar.status === "failed" ? "failed" : "pending",
    isDefault: avatar.is_default,
    createdAt: avatar.created_at,
    error: avatar.error ?? null,
    consentUrl: avatar.consent_url ?? null,
    // The API drops a consent link once it has expired.
    consentUrlExpired: false,
    previewImageUrl: avatar.preview_image_url ?? null,
    previewVideoUrl: avatar.preview_video_url ?? null,
    // The recording is deleted as soon as training finishes.
    recordingUrl: null,
    voiceReady: avatar.voice_id !== undefined,
    voiceId: avatar.voice_id ?? null,
  };
}

export type TwinListResult =
  | { readonly status: "ok"; readonly twins: readonly TwinSummary[] }
  | { readonly status: "error"; readonly message: string };

/** Everything this person has recorded, default first, newest next. */
export async function listTwinsResult(): Promise<TwinListResult> {
  if (!isGoApiConfigured()) return { status: "error", message: "Saved avatars are not available right now." };
  const result = await goApi("/api/v1/avatars?limit=50", avatarsListResponse);
  return result.ok
    ? { status: "ok", twins: result.data.data.map(toSummary) }
    : { status: "error", message: "Could not load saved avatars. Try again." };
}

/** Legacy callers that can safely degrade to an empty list. */
export async function listTwins(): Promise<readonly TwinSummary[]> {
  const result = await listTwinsResult();
  return result.status === "ok" ? result.twins : [];
}

export type DeleteResult = { status: "ok" } | { status: "error"; message: string };

/**
 * Erases one avatar, at HeyGen and here. A provider refusal is surfaced rather
 * than swallowed: telling somebody their likeness is gone while it is still
 * trained somewhere else is the one answer this must never give.
 */
export async function deleteTwin(avatarId: string): Promise<DeleteResult> {
  if (!ownerId.safeParse(avatarId).success) return { status: "error", message: "Unknown avatar." };
  if (!isGoApiConfigured()) return { status: "error", message: "Deletion is not configured" };

  const result = await goApi(`/api/v1/avatars/${avatarId}`, z.null(), { method: "DELETE" });
  return result.ok
    ? { status: "ok" }
    : { status: "error", message: "Your avatar could not be deleted just now. Nothing was removed; try again." };
}

/** Chooses which avatar speaks when a generation does not name one. */
export async function makeDefaultTwin(avatarId: string): Promise<DeleteResult> {
  if (!ownerId.safeParse(avatarId).success) return { status: "error", message: "Unknown avatar." };
  if (!isGoApiConfigured()) return { status: "error", message: "Not configured" };

  const result = await goApi(`/api/v1/avatars/${avatarId}/default`, avatarResponse, { method: "POST" });
  return result.ok ? { status: "ok" } : { status: "error", message: "That avatar could not be made the default." };
}
