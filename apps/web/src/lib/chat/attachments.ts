import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { type createClient } from "@/lib/supabase/server";

/**
 * What a message carried, resolved for display.
 *
 * The database stores object paths, not URLs, because the uploads bucket is
 * private and a signed link lasts two hours. Storing the link would mean a
 * thread that renders today and shows broken images tomorrow, so the link is
 * minted on every read instead.
 */

/**
 * Mirrors `message_attachments_kind_check`, which is narrower than
 * `asset_kind`: user video lives in a different bucket and this module signs
 * against `uploads` only.
 */
export const ATTACHMENT_KINDS = ["photo", "audio"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/** Mirrors the `jsonb_build_object` in `project_thread`. */
export const attachmentRowSchema = z.object({
  kind: z.enum(ATTACHMENT_KINDS),
  path: z.string().min(1),
});

export interface Attachment {
  readonly kind: AttachmentKind;
  readonly path: string;
  /** Null when the object could not be signed, so the UI can say so. */
  readonly url: string | null;
}

/** Long enough that reading a thread and playing a clip cannot outlive it. */
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * What `createSignedUrls` returns.
 *
 * A path it could not sign is still present in the array, carrying an error and
 * a null `signedUrl`. Both facts matter: the response has to be read by path
 * rather than by position, and `signedUrl` has to be nullable. Typing it as a
 * plain string meant one missing object failed the parse for the whole array
 * and blanked every attachment in the thread.
 */
const signedSchema = z.array(
  z.object({ path: z.string().nullable(), signedUrl: z.string().nullable() }),
);

/**
 * Maps a signing response to path-to-url. Separate from the call so the shape
 * assumption above can be checked against the real storage API in a smoke test
 * rather than trusted.
 */
export function toSignedMap(data: unknown): ReadonlyMap<string, string> {
  const parsed = signedSchema.safeParse(data);
  if (!parsed.success) {
    logger.warn("unexpected signing response", { issues: parsed.error.issues });
    return new Map();
  }

  // A path that failed to sign is simply absent from the map, which the caller
  // reads as a null url rather than as a missing attachment.
  return new Map(
    parsed.data
      .filter(
        (row): row is { path: string; signedUrl: string } =>
          row.path !== null && row.signedUrl !== null,
      )
      .map((row) => [row.path, row.signedUrl]),
  );
}

/**
 * Signs every path in one call.
 *
 * Batched deliberately: a thread signs each of its attachments, and doing that
 * one request at a time made a conversation with a dozen photos a dozen
 * sequential round trips before the first pixel rendered.
 */
export async function signAttachmentPaths(
  supabase: Supabase,
  paths: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (paths.length === 0) return new Map();

  // Duplicates are common: the same photo can be attached to more than one
  // turn, and signing it twice buys nothing.
  const unique = [...new Set(paths)];

  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error !== null || data === null) {
    logger.warn("could not sign attachments", { error: error?.message, count: unique.length });
    return new Map();
  }

  return toSignedMap(data);
}
