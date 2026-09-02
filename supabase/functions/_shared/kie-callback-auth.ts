import { timingSafeEqual } from "./security.ts";

/**
 * Authenticating the kie.ai callback.
 *
 * The original scheme put a long-lived shared secret in the callback URL's
 * query string. A URL is the most copied string in a distributed system: it is
 * written to the provider's own request logs, to any proxy in between, and to
 * traces on both sides. A secret that leaks that way is replayable against
 * every job, and the callback can mark a generation complete or failed.
 *
 * kie.ai signs its callbacks: `X-Webhook-Signature` carries a base64
 * HMAC-SHA256 of `taskId + "." + timestampSeconds` under a key generated in
 * the kie.ai console, with the timestamp in `X-Webhook-Timestamp`. That moves
 * the credential out of the URL entirely and binds each callback to one task
 * and one moment, which the shared secret never did.
 *
 * The signing key is issued from the provider's console, so this stays inert
 * until `KIE_WEBHOOK_HMAC_KEY` is set and the query-string check remains in
 * place behind it. Once the key exists, signatures become mandatory and the
 * query token is not consulted at all.
 */

/** How far out of date a signed callback may be. Long enough for a slow
 *  delivery and a retry, short enough that a captured request stops being
 *  useful quickly. */
const MAX_SKEW_SECONDS = 300;

export type CallbackAuth =
  | { readonly ok: true; readonly scheme: "signature" | "query-token" }
  | { readonly ok: false; readonly reason: string };

const encoder = new TextEncoder();

async function sign(key: string, payload: string): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", material, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Decides whether a callback really came from kie.ai.
 *
 * `taskId` comes from the body because that is what the provider signs, which
 * also means a valid signature cannot be replayed against a different job.
 */
export async function authenticateCallback(
  req: Request,
  taskId: string,
  now: () => number = Date.now,
): Promise<CallbackAuth> {
  const hmacKey = Deno.env.get("KIE_WEBHOOK_HMAC_KEY") ?? "";

  if (hmacKey) {
    const provided = req.headers.get("x-webhook-signature") ?? "";
    const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
    if (!provided || !timestamp) return { ok: false, reason: "missing signature headers" };

    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds)) return { ok: false, reason: "malformed timestamp" };
    if (Math.abs(now() / 1000 - seconds) > MAX_SKEW_SECONDS) {
      // Bounds replay: a captured callback stops being accepted once the
      // window closes, which a bare signature check would never do.
      return { ok: false, reason: "timestamp outside the accepted window" };
    }

    const expected = await sign(hmacKey, `${taskId}.${timestamp}`);
    return timingSafeEqual(provided, expected)
      ? { ok: true, scheme: "signature" }
      : { ok: false, reason: "signature mismatch" };
  }

  // Fallback, kept only until a signing key is issued from the kie.ai console.
  const expected = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  const provided = new URL(req.url).searchParams.get("token") ?? "";
  if (!expected || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "invalid callback token" };
  }
  return { ok: true, scheme: "query-token" };
}

/**
 * The callback URL handed to kie.ai when a job is created.
 *
 * Carries the token only while there is no signing key. Once one exists the
 * secret stops being written into provider logs at all, which is the point of
 * the change.
 */
export function callbackUrl(): string | undefined {
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-callback`;
  if (Deno.env.get("KIE_WEBHOOK_HMAC_KEY")) return base;

  const secret = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  return secret ? `${base}?token=${encodeURIComponent(secret)}` : undefined;
}
