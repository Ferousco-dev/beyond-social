"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { classifySubject } from "@/lib/generation/likeness";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Photo upload.
 *
 * The bytes never pass through the server. They used to: the file went to a
 * server action as form data, which capped uploads at Next's 1MB server action
 * body limit, so every photo a phone takes was rejected before the action ran
 * and the compose menu appeared to do nothing. Raising that limit would not
 * have helped in production either, because the serverless platform caps
 * request bodies at 4.5MB regardless of framework config.
 *
 * So the server issues a short-lived signed URL for a path it chooses, and the
 * browser uploads straight to storage. The path always starts with the caller's
 * own id, which is the prefix the bucket policy scopes writes to, so a ticket
 * cannot be aimed at anyone else's folder.
 *
 * Type and size are checked here for a useful error message and enforced again
 * by the bucket, which is the check that counts: everything the client sends
 * about a file can be a lie.
 */

/** Kept in step with what the video model will accept as an input frame. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;

/** Matches the bucket's own limit, so a rejection can be explained rather than raw. */
const MAX_BYTES = 10 * 1024 * 1024;

/** The generator takes a small number of reference frames, not an album. */
const MAX_FILES = 4;

/** Comfortably longer than a generation, so a slow queue cannot expire the link. */
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

const EXTENSIONS: Record<(typeof ACCEPTED)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ticketSchema = z.object({
  files: z
    .array(
      z.object({
        type: z.enum(ACCEPTED, { message: "Photos must be JPEG, PNG, or WebP" }),
        size: z.number().int().positive().max(MAX_BYTES, "Each photo must be under 10 MB"),
      }),
    )
    .min(1, "Choose a photo first")
    .max(MAX_FILES, `Up to ${MAX_FILES} photos at a time`),
});

const attachSchema = z.object({
  projectId: z.string().min(1),
  paths: z.array(z.string().min(1)).min(1).max(MAX_FILES),
});

export interface UploadTicket {
  readonly path: string;
  /** Handed to `uploadToSignedUrl` in the browser. */
  readonly token: string;
}

export interface UploadedPhoto {
  readonly url: string;
  readonly path: string;
}

export type TicketResult =
  | { status: "ok"; tickets: readonly UploadTicket[] }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export type UploadResult =
  | { status: "ok"; photos: readonly UploadedPhoto[] }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/**
 * What the browser knows about a chosen file. Deliberately typed loosely: a
 * `File`'s type is a plain string, and narrowing it is this action's job rather
 * than the caller's.
 */
export interface ChosenFile {
  readonly type: string;
  readonly size: number;
}

/** Issues one signed upload URL per file, each under the caller's own prefix. */
export async function createUploadTickets(input: {
  files: readonly ChosenFile[];
}): Promise<TicketResult> {
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Those files cannot be used",
    };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to upload" };

  const tickets: UploadTicket[] = [];
  for (const [index, file] of parsed.data.files.entries()) {
    // Built here rather than accepted from the client, so the owning prefix and
    // the extension both come from something the server decided.
    const path = `${user.id}/${crypto.randomUUID()}-${index}.${EXTENSIONS[file.type]}`;
    const { data, error } = await supabase.storage.from("uploads").createSignedUploadUrl(path);
    if (error || !data) {
      logger.error("could not create upload ticket", { error: error?.message ?? "no data" });
      return { status: "error", message: "Could not start that upload" };
    }
    tickets.push({ path: data.path, token: data.token });
  }

  return { status: "ok", tickets };
}

/**
 * Records the uploaded objects and signs them for reading.
 *
 * The bucket is private and the video provider fetches the image itself, so an
 * unsigned URL would 403 and the generation would fail with an unhelpful error.
 */
export async function attachUploadedPhotos(
  input: z.input<typeof attachSchema>,
): Promise<UploadResult> {
  const parsed = attachSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Invalid input" };
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to upload" };

  // The paths come back from the client, so ownership is re-checked rather than
  // assumed. Signing for reading is not gated by the write policy, so without
  // this a caller could ask for a readable link to somebody else's object.
  const foreign = parsed.data.paths.some((path) => !path.startsWith(`${user.id}/`));
  if (foreign) return { status: "error", message: "Those photos could not be attached" };

  const { projectId } = parsed.data;
  const photos: UploadedPhoto[] = [];
  try {
    for (const path of parsed.data.paths) {
      const { data, error } = await supabase.storage
        .from("uploads")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "Uploaded photo has no reachable URL");
      }

      /*
       * Classified here, at upload, rather than at send.
       *
       * The answer decides whether the likeness attestation is asked for, and
       * asking it over a photo of a product is how a consent dialog becomes
       * something people click past. Doing it now costs a few seconds while
       * the user is still typing, where doing it at send would sit in front of
       * the generation they just asked for.
       *
       * Failure resolves to `person`, which is the safe direction: a needless
       * dialog is an annoyance, a missed one means a real face was animated
       * with nothing recorded.
       */
      const { data: object } = await supabase.storage.from("uploads").download(path);
      const subject = object
        ? await classifySubject(new Uint8Array(await object.arrayBuffer()), object.type)
        : "person";

      // Recorded so a thread can be rebuilt with the photos that fed it, and so
      // an orphaned object can be found later.
      await supabase.from("assets").insert({
        user_id: user.id,
        project_id: projectId !== "new" ? projectId : null,
        kind: "photo",
        storage_path: path,
        contains_person: subject === "person",
      });

      photos.push({ url: data.signedUrl, path });
    }
  } catch (error) {
    logger.error("photo attach failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not attach that photo" };
  }

  return { status: "ok", photos };
}
