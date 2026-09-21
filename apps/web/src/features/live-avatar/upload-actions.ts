"use server";

import { z } from "zod";

import { env, isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { HEYGEN_CONSENT_VERSION } from "./consent";
import { hasReachedAvatarLimit, MAX_CUSTOM_AVATARS } from "./avatar-limits";

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

  const { count, error: countError } = await supabase
    .from("heygen_avatars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return { status: "error", message: "Could not check your avatar library" };
  if (hasReachedAvatarLimit(count ?? 0)) {
    return {
      status: "error",
      message: `You can keep up to ${MAX_CUSTOM_AVATARS} avatars. Delete one before adding another.`,
    };
  }

  const extension = EXTENSIONS[parsed.data.contentType.split(";")[0]!];
  const path = `${user.id}/twin-${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from("avatar-footage").createSignedUploadUrl(path);
  if (error || !data) {
    logger.warn("could not ticket twin footage", { error: error?.message ?? "no data" });
    return { status: "error", message: "Could not start that upload" };
  }

  return { status: "ok", ticket: { path: data.path, token: data.token } };
}

export type TrainingState = "pending" | "ready" | "failed";

export type TrainingResult =
  | {
      status: "ok";
      avatarId: string;
      training: TrainingState;
      trained: boolean;
      consentUrl: string | null;
    }
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

  const { count, error: countError } = await supabase
    .from("heygen_avatars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return { status: "error", message: "Could not check your avatar library" };
  if (hasReachedAvatarLimit(count ?? 0)) {
    return {
      status: "error",
      message: `You can keep up to ${MAX_CUSTOM_AVATARS} avatars. Delete one before adding another.`,
    };
  }

  // Checked here as well as in the function: a path outside the caller's own
  // prefix is either a bug or an attempt to train on somebody else's footage,
  // and it should not take a round trip to say so.
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { status: "error", message: "That recording does not belong to this account" };
  }

  const { data, error } = await supabase.functions.invoke("train-heygen-avatar", {
    body: {
      storagePath,
      consentVersion: HEYGEN_CONSENT_VERSION,
      rerouteUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/dashboard/assets?heygen_setup=complete`,
    },
  });
  if (error) {
    logger.warn("could not start twin training", { error: error.message });
    return { status: "error", message: "Your recording was saved, but training could not start" };
  }

  const result = data as {
    avatarId?: string;
    status?: TrainingState;
    trained?: boolean;
    consentUrl?: string | null;
  } | null;
  if (!result?.avatarId) {
    return { status: "error", message: "Your recording was saved, but training could not start" };
  }
  return {
    status: "ok",
    avatarId: result.avatarId,
    training: result.status ?? "pending",
    trained: result.trained ?? false,
    consentUrl: result.consentUrl ?? null,
  };
}

export async function refreshHostedConsent(
  avatarId?: string,
): Promise<{ status: "ok"; consentUrl: string | null } | { status: "error"; message: string }> {
  if (!isSupabaseConfigured) return { status: "error", message: "Training is not configured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to continue" };

  const { data, error } = await supabase.functions.invoke("create-heygen-consent", {
    body: {
      avatarId,
      rerouteUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/dashboard/assets?heygen_setup=complete`,
    },
  });
  if (error) {
    logger.warn("could not refresh hosted heygen consent", { error: error.message });
    return { status: "error", message: "Could not open HeyGen setup. Try again." };
  }

  const result = data as { consentUrl?: string | null } | null;
  return { status: "ok", consentUrl: result?.consentUrl ?? null };
}
