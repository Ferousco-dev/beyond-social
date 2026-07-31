import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Webhook signing secrets, handled exactly like API keys in `lib/api/keys.ts`.
 *
 * The plaintext exists once, in the action result that created it. Only the
 * SHA-256 digest and the last four characters are stored, so the secret cannot
 * be shown again, cannot be recovered from a database dump, and rotation is the
 * only way back. That is a real constraint on the UI, not a preference: the
 * page has to make the user copy it before they navigate away.
 *
 * SHA-256 rather than a slow password hash on purpose. This is a 32-byte random
 * value, not a human-chosen password, so there is no dictionary to run and no
 * work factor worth paying on every outbound delivery.
 */

const PREFIX = "whsec_";

export interface GeneratedSecret {
  /** Returned to the caller once and never persisted. */
  plaintext: string;
  hash: string;
  /** The tail, kept so the user can tell two endpoints' secrets apart. */
  lastFour: string;
}

export function generateWebhookSecret(): GeneratedSecret {
  const plaintext = `${PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    plaintext,
    hash: hashWebhookSecret(plaintext),
    lastFour: plaintext.slice(-4),
  };
}

export function hashWebhookSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
