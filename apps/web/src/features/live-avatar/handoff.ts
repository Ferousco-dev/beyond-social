import { createHash } from "node:crypto";

/**
 * Handoff token handling, kept out of the actions file for the same reason the
 * consent statement is: a "use server" module may only export async functions,
 * and both the minting action and the route handlers the phone talks to need
 * these synchronously.
 */

/** Long enough to walk to better light, short enough to be stale by tomorrow. */
export const HANDOFF_MINUTES = 20;

/**
 * What is stored, and what is compared against.
 *
 * The token itself is never persisted: only its SHA-256 reaches Postgres, the
 * way an API key would be kept, so a leaked backup hands out nothing scannable.
 */
export function hashHandoffToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Rejects anything not shaped like a token before it costs a database round trip. */
export function looksLikeHandoffToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
