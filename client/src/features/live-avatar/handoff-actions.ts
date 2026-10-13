"use server";

import { env } from "@/lib/env";
import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { handoffResponse } from "@/lib/go-api/schemas";

/**
 * Minting the link that carries a recording to somebody's phone.
 *
 * The Go API generates the token and stores only its hash, so the secret
 * exists only in the QR code on screen and the phone's address bar.
 */
export type HandoffResult =
  | { status: "ok"; url: string; expiresAt: number }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function mintHandoff(): Promise<HandoffResult> {
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi("/api/v1/avatars/handoffs", handoffResponse, { method: "POST" });
  if (!result.ok) return { status: "error", message: "Could not create a phone link just now" };

  // Absolute, because it is scanned by a device that is not on this page and is
  // often not on this network.
  return {
    status: "ok",
    url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/r/${result.data.data.token}`,
    expiresAt: new Date(result.data.data.expires_at).getTime(),
  };
}
