"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Photo upload.
 *
 * The product generates video from the user's own photos, and the compose menu
 * has always had an "Add photos" item that discarded the file. This stores it.
 *
 * Uploads go to the `uploads` bucket under the user's own id, which is exactly
 * the prefix its storage policy scopes to, so a path is only writable by its
 * owner.
 *
 * The bucket is private, so the URL handed back is signed. That matters because
 * the video provider fetches the image itself: a public-style URL would simply
 * 403 and the generation would fail with an unhelpful error. The signature has
 * to outlive the generation, hence hours rather than minutes.
 */

/** Kept in step with what the video model will accept as an input frame. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;

/** Large enough for a phone photo, small enough to bound a request. */
const MAX_BYTES = 8 * 1024 * 1024;

/** The generator takes a small number of reference frames, not an album. */
const MAX_FILES = 4;

/** Comfortably longer than a generation, so a slow queue cannot expire the link. */
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

export interface UploadedPhoto {
  readonly url: string;
  readonly path: string;
}

export type UploadResult =
  | { status: "ok"; photos: readonly UploadedPhoto[] }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

const projectSchema = z.string().min(1);

/** Extension from the mime type, so a path never trusts the client's filename. */
function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadPhotos(formData: FormData): Promise<UploadResult> {
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const projectId = projectSchema.safeParse(formData.get("projectId"));
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) return { status: "error", message: "Choose a photo first" };
  if (files.length > MAX_FILES) {
    return { status: "error", message: `Up to ${MAX_FILES} photos at a time` };
  }

  // Validated before any upload, so a rejected batch does not leave half its
  // files stored.
  for (const file of files) {
    if (!(ACCEPTED as readonly string[]).includes(file.type)) {
      return { status: "error", message: "Photos must be JPEG, PNG, or WebP" };
    }
    if (file.size > MAX_BYTES) {
      return { status: "error", message: "Each photo must be under 8 MB" };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to upload" };

  const photos: UploadedPhoto[] = [];
  try {
    for (const [index, file] of files.entries()) {
      // The user id must be the first path segment: the storage policy checks it.
      const path = `${user.id}/${crypto.randomUUID()}-${index}.${extensionFor(file.type)}`;
      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);

      const { data, error: signError } = await supabase.storage
        .from("uploads")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signError || !data?.signedUrl) {
        throw new Error(signError?.message ?? "Uploaded photo has no reachable URL");
      }

      // Recorded so a thread can be rebuilt with the photos that fed it, and so
      // an orphaned object can be found later.
      await supabase.from("assets").insert({
        user_id: user.id,
        project_id: projectId.success && projectId.data !== "new" ? projectId.data : null,
        kind: "photo",
        storage_path: path,
      });

      photos.push({ url: data.signedUrl, path });
    }
  } catch (error) {
    logger.error("photo upload failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not upload that photo" };
  }

  return { status: "ok", photos };
}
