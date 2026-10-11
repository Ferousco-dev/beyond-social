"use server";

import { randomBytes } from "node:crypto";

import { env, isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { HANDOFF_MINUTES, hashHandoffToken } from "./handoff";

/**
 * Minting the link that carries a recording to somebody's phone.
 *
 * The token is generated here and hashed before it goes anywhere near
 * Postgres, so the only places the secret itself exists are the QR code on
 * screen and the URL bar on the phone. A database dump, a query log or a
 * backup contains hashes and nothing that can be scanned.
 */

/** 32 bytes, url-safe, which is the same shape a session token would take. */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export type HandoffResult =
  | { status: "ok"; url: string; expiresAt: number }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function mintHandoff(): Promise<HandoffResult> {
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to record from your phone" };

  const token = newToken();
  const { data, error } = await supabase.rpc("mint_avatar_handoff", {
    p_token_hash: hashHandoffToken(token),
    p_minutes: HANDOFF_MINUTES,
  });
  if (error || typeof data !== "string") {
    logger.warn("could not mint an avatar handoff", { error: error?.message ?? "no expiry" });
    return { status: "error", message: "Could not create a phone link just now" };
  }

  /*
   * An absolute URL, because this is scanned by a device that is not on this
   * page and frequently not on this network. `NEXT_PUBLIC_APP_URL` is the only
   * address the app knows itself by; a relative path would resolve against the
   * phone's own browser and go nowhere.
   */
  return {
    status: "ok",
    url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/r/${token}`,
    expiresAt: new Date(data).getTime(),
  };
}
