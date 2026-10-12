"use server";

import { z } from "zod";

import { env, isSupabaseConfigured } from "@/lib/env";
import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { avatarResponse, type GoAvatar } from "@/lib/go-api/schemas";
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

  if (!isGoApiConfigured()) {
    return { status: "error", message: "Your recording was saved, but training is not switched on yet" };
  }

  // One key per recording, so a retried or double-submitted request is one avatar.
  const created = await goApi("/api/v1/avatars", avatarResponse, {
    method: "POST",
    body: {
      storage_path: storagePath,
      consent_confirmed: true,
      consent_version: HEYGEN_CONSENT_VERSION,
      reroute_url: rerouteUrl(),
    },
    headers: { "Idempotency-Key": `twin:${storagePath}` },
  });
  if (!created.ok) {
    logger.warn("could not start twin training", { code: created.code });
    return { status: "error", message: created.message };
  }

  // The consent link is issued by the background worker a few seconds after
  // the avatar is queued; wait briefly so the person lands on it directly.
  const avatar = await waitForConsentLink(created.data.data);
  return {
    status: "ok",
    avatarId: avatar.id,
    training: avatar.status === "ready" ? "ready" : avatar.status === "failed" ? "failed" : "pending",
    trained: avatar.status === "ready",
    consentUrl: avatar.consent_url ?? null,
  };
}

const CONSENT_WAIT_MS = 12_000;

async function waitForConsentLink(first: GoAvatar): Promise<GoAvatar> {
  let avatar = first;
  const deadline = Date.now() + CONSENT_WAIT_MS;
  while (avatar.status === "training" && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    const next = await goApi(`/api/v1/avatars/${avatar.id}`, avatarResponse);
    if (!next.ok) break;
    avatar = next.data.data;
  }
  return avatar;
}

/** Where HeyGen's hosted consent page sends the person afterwards. */
function rerouteUrl(): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/dashboard/assets?heygen_setup=complete`;
}

export async function refreshHostedConsent(
  avatarId?: string,
): Promise<{ status: "ok"; consentUrl: string | null } | { status: "error"; message: string }> {
  if (!avatarId) return { status: "error", message: "Choose which avatar to continue" };
  if (!isGoApiConfigured()) return { status: "error", message: "Training is not configured" };

  const result = await goApi(`/api/v1/avatars/${avatarId}/consent`, avatarResponse, { method: "POST" });
  if (!result.ok) {
    logger.warn("could not refresh hosted heygen consent", { code: result.code });
    return { status: "error", message: "Could not open HeyGen setup. Try again." };
  }
  return { status: "ok", consentUrl: result.data.data.consent_url ?? null };
}
