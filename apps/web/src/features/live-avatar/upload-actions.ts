"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { HEYGEN_CONSENT_VERSION } from "./consent";

/**
 * Getting recorded footage from the browser into storage, and turning it into a
 * twin.
 *
 * One training entry point for both routes on purpose. The desktop recorder
 * ends here directly; the phone uploads on its own and this side starts the
 * training once it sees the handoff was claimed. Two entry points would mean
 * two definitions of what a completed recording is, and the phone would need a
 * session it does not have to use the second one.
 */

/** Matches what the recorder produces and what the handoff route accepts. */
const EXTENSIONS: Readonly<Record<string, string>> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const ticketSchema = z.object({
  contentType: z.string().refine((value) => value.split(";")[0]! in EXTENSIONS, {
    message: "That video format cannot be used",
  }),
});

export interface TwinUploadTicket {
  readonly path: string;
  /** Handed to `uploadToSignedUrl` in the browser. */
  readonly token: string;
}

export type TicketResult =
  { status: "ok"; ticket: TwinUploadTicket } | { status: "error"; message: string };

/**
 * A signed slot to upload one recording into.
 *
 * The path is built here rather than accepted from the caller, so the owning
 * prefix and the extension both come from something the server decided. Same
 * rule the composer's photo upload and the phone handoff already follow.
 */
export async function ticketTwinFootage(contentType: string): Promise<TicketResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Uploads are not configured" };

  const parsed = ticketSchema.safeParse({ contentType });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Unsupported format" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to save this recording" };

  const extension = EXTENSIONS[parsed.data.contentType.split(";")[0]!];
  const path = `${user.id}/twin-${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from("uploads").createSignedUploadUrl(path);
  if (error || !data) {
    logger.warn("could not ticket twin footage", { error: error?.message ?? "no data" });
    return { status: "error", message: "Could not start that upload" };
  }

  return { status: "ok", ticket: { path: data.path, token: data.token } };
}

export type TrainingState = "pending" | "ready" | "failed";

export type TrainingResult =
  | { status: "ok"; training: TrainingState; trained: boolean }
  | { status: "error"; message: string };

/**
 * Records the footage as this person's twin and asks the provider to train it.
 *
 * Succeeds whether or not there is a provider configured. The recording and the
 * consent are saved either way, and training is the part that waits, so
 * somebody who has just spent a minute reading a statement to a camera is never
 * told it was for nothing because a key is missing.
 */
export async function startTwinTraining(storagePath: string): Promise<TrainingResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Training is not configured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to finish your avatar" };

  // Checked here as well as in the function: a path outside the caller's own
  // prefix is either a bug or an attempt to train on somebody else's footage,
  // and it should not take a round trip to say so.
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { status: "error", message: "That recording does not belong to this account" };
  }

  const { data, error } = await supabase.functions.invoke("train-heygen-avatar", {
    body: { storagePath, consentVersion: HEYGEN_CONSENT_VERSION },
  });
  if (error) {
    logger.warn("could not start twin training", { error: error.message });
    return { status: "error", message: "Your recording was saved, but training could not start" };
  }

  const result = data as { status?: TrainingState; trained?: boolean } | null;
  return {
    status: "ok",
    training: result?.status ?? "pending",
    trained: result?.trained ?? false,
  };
}

export interface TwinStatus {
  readonly training: TrainingState | null;
  readonly error: string | null;
  /** Set once the phone has uploaded, so the desktop knows to pick it up. */
  readonly handoffPath: string | null;
}

/**
 * What the screen is waiting on: this person's twin, and any footage a phone
 * has just finished sending.
 *
 * Both in one read because the desktop is polling for whichever arrives first,
 * and asking twice a second for two things separately is two round trips to
 * answer one question.
 */
export async function twinStatus(): Promise<TwinStatus> {
  const empty: TwinStatus = { training: null, error: null, handoffPath: null };
  if (!isSupabaseConfigured) return empty;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [avatar, handoff] = await Promise.all([
    /*
     * Ordered rather than fetched as the caller's one row. Since a person may
     * hold several avatars, `.maybeSingle()` here threw the moment somebody
     * recorded a second one; this screen is watching the recording that was
     * just made, which is the newest, and the library orders itself the same
     * way so the two never disagree about which avatar is being talked about.
     */
    supabase
      .from("heygen_avatars")
      .select("training_status, provider_error")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("avatar_handoffs")
      .select("storage_path, claimed_at")
      .not("claimed_at", "is", null)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const row = (
    (avatar.data ?? []) as {
      training_status: TrainingState;
      provider_error: string | null;
    }[]
  )[0];
  const claimed = handoff.data as { storage_path: string | null } | null;

  return {
    training: row?.training_status ?? null,
    error: row?.provider_error ?? null,
    handoffPath: claimed?.storage_path ?? null,
  };
}
