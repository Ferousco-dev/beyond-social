import "server-only";

import { createCipheriv, randomBytes } from "node:crypto";

import { serverEnv } from "@/lib/server-env";

/**
 * Webhook signing secrets.
 *
 * The plaintext is shown to the user exactly once, in the action result that
 * created it, and stored encrypted rather than hashed. That is the difference
 * between this and `lib/api/keys.ts`, and it follows from the direction of
 * travel: an API key is a credential someone presents to us, so a digest is
 * enough to check it, while a signing secret is one we present to them, and an
 * HMAC cannot be computed from a digest.
 *
 * AES-256-GCM under a key from the environment. The database therefore still
 * holds nothing that can sign a payload on its own: recovering a secret needs
 * the ciphertext and a key that lives somewhere a database dump does not.
 *
 * Decryption lives in the sender, which runs as an edge function, so it is not
 * here. The two must agree on the format, which is why the format is stated
 * plainly: `v1.<iv base64url>.<ciphertext base64url>.<tag base64url>`.
 */

const PREFIX = "whsec_";
const FORMAT = "v1";

export interface GeneratedSecret {
  /** Returned to the caller once and never persisted in the clear. */
  plaintext: string;
  /** What goes in the column: versioned, self-describing ciphertext. */
  encrypted: string;
  /** The tail, kept so the user can tell two endpoints' secrets apart. */
  lastFour: string;
}

/**
 * The key, as bytes. Thrown rather than defaulted: encrypting under a key of
 * zeroes because the environment was misconfigured would look like it worked
 * and would protect nothing.
 */
function encryptionKey(): Buffer {
  const raw = serverEnv.WEBHOOK_SECRET_KEY;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("WEBHOOK_SECRET_KEY must be 32 bytes, base64 encoded");
  }
  return key;
}

/** False when signing secrets cannot be stored, so the UI can say so up front. */
export const isWebhookSigningConfigured = ((): boolean => {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
})();

export function generateWebhookSecret(): GeneratedSecret {
  const plaintext = `${PREFIX}${randomBytes(32).toString("base64url")}`;

  // A fresh 12-byte nonce per secret. GCM's security collapses if a nonce is
  // ever reused under the same key, so this must never be derived from
  // anything about the row.
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    plaintext,
    encrypted: [
      FORMAT,
      iv.toString("base64url"),
      body.toString("base64url"),
      tag.toString("base64url"),
    ].join("."),
    lastFour: plaintext.slice(-4),
  };
}
