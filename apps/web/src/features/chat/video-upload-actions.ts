"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Footage the user supplies, for models that edit video or copy motion from it.
 *
 * A separate action from the photo tickets rather than a parameter on them.
 * The two differ in every constraint that matters: a different bucket, a
 * hundred-megabyte ceiling instead of ten, a different set of types, and one
 * file rather than four. Folding them together would mean one schema that
 * enforces the loosest of each, which is how an upload gets accepted here and
 * refused by the provider after a credit is spent.
 */

/** What the motion-control model accepts, so a rejection happens before upload. */
const ACCEPTED = ["video/mp4", "video/quicktime"] as const;

/** The bucket's own limit, which is in turn the provider's. */
const MAX_BYTES = 100 * 1024 * 1024;

const EXTENSIONS: Record<(typeof ACCEPTED)[number], string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

/** What the file input should offer, kept in step with `ACCEPTED`. */
export const VIDEO_ACCEPT = ACCEPTED.join(",");

const ticketSchema = z.object({
  type: z.enum(ACCEPTED, { message: "Video must be MP4 or MOV" }),
  size: z.number().int().positive().max(MAX_BYTES, "The video must be under 100 MB"),
});

export type VideoTicketResult =
  | { status: "ok"; path: string; token: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/**
 * Issues one signed upload URL under the caller's own prefix.
 *
 * The path is built here rather than accepted from the client, so the owning
 * prefix and the extension both come from something the server decided. The
 * bucket policy scopes writes to that prefix, which is the check that counts.
 */
export async function createVideoUploadTicket(
  input: z.input<typeof ticketSchema>,
): Promise<VideoTicketResult> {
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "That video cannot be used",
    };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to upload" };

  const path = `${user.id}/${crypto.randomUUID()}.${EXTENSIONS[parsed.data.type]}`;
  const { data, error } = await supabase.storage.from("video-uploads").createSignedUploadUrl(path);
  if (error || !data) {
    logger.error("could not create video upload ticket", {
      error: error?.message ?? "no data",
    });
    return { status: "error", message: "Could not start that upload" };
  }

  return { status: "ok", path: data.path, token: data.token };
}
