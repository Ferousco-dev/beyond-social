// Verifying that a callback really came from kie.ai.
//
// The URL token this sat beside for a long time works, but a secret that
// travels in a query string ends up in proxy logs and referrers. kie.ai now
// signs every callback with HMAC-SHA256 over `taskId + "." + timestamp`,
// base64-encoded, keyed from a per-account value generated on their settings
// page, and sends it in `X-Webhook-Signature` with the timestamp in
// `X-Webhook-Timestamp`. Docs: https://docs.kie.ai/common-api/webhook-verification
//
// Signature verification is preferred and the token is the fallback: an
// environment that has set the HMAC key gets the stronger check, and one that
// has not (local development, a deploy that has not caught up) still accepts
// the token path it always did. Neither alone is accepted when the other is
// configured, so a caller cannot downgrade an authenticated channel by
// omitting headers.
import { timingSafeEqual } from "./security.ts";

const SIGNATURE_HEADER = "X-Webhook-Signature";
const TIMESTAMP_HEADER = "X-Webhook-Timestamp";

/** A timestamp far from now means the signature is being replayed. */
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

/**
 * Whether the callback's signature is genuine, for the task id in its body.
 *
 * Constant-time compared, and false rather than thrown on anything malformed:
 * a bad header is a rejected request, not an error worth a stack trace.
 */
export async function hasValidKieSignature(
  req: Request,
  taskId: string,
): Promise<boolean> {
  const key = Deno.env.get("KIE_WEBHOOK_HMAC_KEY") ?? "";
  if (key === "") return false;

  const timestamp = req.headers.get(TIMESTAMP_HEADER) ?? "";
  const provided = req.headers.get(SIGNATURE_HEADER) ?? "";
  if (timestamp === "" || provided === "") return false;

  const seconds = Number(timestamp);
  if (!Number.isInteger(seconds)) return false;
  if (Math.abs(Date.now() / 1000 - seconds) > MAX_CLOCK_SKEW_SECONDS) return false;

  const message = `${taskId}.${timestamp}`;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  // Matches the docs' `Base64.encode(HMAC-SHA256(...))`: standard base64, not base64url.
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return timingSafeEqual(provided, expected);
}

/** Whether the HMAC key is configured, so the caller knows the token path is closed. */
export function isKieHmacConfigured(): boolean {
  return (Deno.env.get("KIE_WEBHOOK_HMAC_KEY") ?? "") !== "";
}
