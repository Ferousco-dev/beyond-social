"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Voice clip upload, for avatar renders.
 *
 * The same signed-ticket shape as photos, for the same reason: the bytes never
 * pass through a server action, which caps request bodies well below the size
 * of a voice recording. Kept separate from the photo uploader rather than
 * folded into it because the accepted types, the extensions and the asset kind
 * all differ, and one function taking a discriminator would be harder to read
 * than two that each do one thing.
 */

/**
 * Exactly what the provider accepts. WebM is absent on purpose even though a
 * browser recorder emits it by default: accepting an upload the provider will
 * refuse turns a clear rejection here into a paid render that fails later.
 */
const ACCEPTED = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/mp4",
  "audio/ogg",
] as const;

/** The provider's own ceiling, mirrored by the bucket. */
const MAX_BYTES = 10 * 1024 * 1024;

/** Comfortably longer than a render, so a slow queue cannot expire the link. */
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

const EXTENSIONS: Record<(typeof ACCEPTED)[number], string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
};

const ticketSchema = z.object({
  type: z.enum(ACCEPTED, { message: "Voice clips must be MP3, WAV, AAC, M4A, or OGG" }),
  size: z.number().int().positive().max(MAX_BYTES, "Voice clips must be under 10 MB"),
});

const attachSchema = z.object({
  projectId: z.string().min(1),
  path: z.string().min(1),
});

export interface AudioTicket {
  readonly path: string;
  readonly token: string;
}

export type AudioTicketResult =
  | { status: "ok"; ticket: AudioTicket }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export type AudioAttachResult =
  | { status: "ok"; url: string; path: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/** Issues one signed upload URL, under the caller's own prefix. */
export async function createAudioTicket(input: {
  type: string;
  size: number;
}): Promise<AudioTicketResult> {
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "That clip cannot be used" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to upload" };

  const path = `${user.id}/${crypto.randomUUID()}.${EXTENSIONS[parsed.data.type]}`;
  const { data, error } = await supabase.storage.from("uploads").createSignedUploadUrl(path);
  if (error || !data) {
    logger.error("could not create audio ticket", { error: error?.message ?? "no data" });
    return { status: "error", message: "Could not start that upload" };
  }

  return { status: "ok", ticket: { path: data.path, token: data.token } };
}

/** Records the clip and signs it for the provider to fetch. */
export async function attachUploadedAudio(
  input: z.input<typeof attachSchema>,
): Promise<AudioAttachResult> {
  const parsed = attachSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Invalid input" };
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to upload" };

  // The path comes back from the client, so ownership is re-checked. Signing
  // for reading is not gated by the write policy, so without this a caller
  // could ask for a readable link to someone else's clip.
  if (!parsed.data.path.startsWith(`${user.id}/`)) {
    return { status: "error", message: "That clip could not be attached" };
  }

  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrl(parsed.data.path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    logger.error("could not sign audio", { error: error?.message ?? "no url" });
    return { status: "error", message: "Could not attach that clip" };
  }

  await supabase.from("assets").insert({
    user_id: user.id,
    project_id: parsed.data.projectId !== "new" ? parsed.data.projectId : null,
    kind: "audio",
    storage_path: parsed.data.path,
  });

  return { status: "ok", url: data.signedUrl, path: parsed.data.path };
}
