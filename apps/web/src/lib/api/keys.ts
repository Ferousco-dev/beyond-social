import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * API key handling.
 *
 * The plaintext key exists exactly once, in the response that creates it. Only
 * its SHA-256 is stored, so a database dump yields nothing usable and we
 * genuinely cannot show the key again later.
 */

const PREFIX = "bsk_";

export interface GeneratedKey {
  /** Returned to the caller once and never persisted. */
  plaintext: string;
  hash: string;
  /** Recognisable fragment kept for display. */
  prefix: string;
}

export function generateApiKey(): GeneratedKey {
  // 32 bytes of CSPRNG entropy; base64url keeps it copy-pasteable.
  const secret = randomBytes(32).toString("base64url");
  const plaintext = `${PREFIX}${secret}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, PREFIX.length + 6),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Pulls a bearer key off a request, if one is present and well-formed. */
export function readBearerKey(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const value = header.slice(7).trim();
  return value.startsWith(PREFIX) ? value : null;
}
