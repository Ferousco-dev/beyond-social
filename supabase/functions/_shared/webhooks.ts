// Outbound webhook delivery.
//
// Runs where the event actually happens: the provider's callback is the moment
// a render becomes finished, and anything later would be a second system
// watching the first for changes it already knows about.
//
// One attempt per endpoint with a short timeout, then a failure is counted and
// the delivery is dropped. Retries need a queue and a schedule to be worth
// anything, and a retry loop inside a callback handler is just a slower way to
// fail while the provider waits on us. Receivers are told to expect at-least
// once and to tolerate a miss.
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { log } from "./trace.ts";

/** Matches `apps/web/src/lib/webhooks/types.ts`. Changing one changes both. */
const SIGNATURE_HEADER = "X-Beyond-Signature";
const TIMESTAMP_HEADER = "X-Beyond-Timestamp";
const EVENT_HEADER = "X-Beyond-Event";

/** A slow receiver must not hold the callback open. */
const TIMEOUT_MS = 5_000;

export type WebhookEvent =
  "generation.completed" | "generation.failed" | "post.published" | "post.failed";

interface Endpoint {
  id: string;
  url: string;
  secret_encrypted: string;
}

/**
 * Recovers a signing secret. The format is written by
 * `apps/web/src/lib/webhooks/secret.ts`: `v1.<iv>.<ciphertext>.<tag>`, all
 * base64url, AES-256-GCM.
 */
async function decrypt(encrypted: string, key: CryptoKey): Promise<string | null> {
  const [version, iv, body, tag] = encrypted.split(".");
  if (version !== "v1" || !iv || !body || !tag) return null;

  try {
    // WebCrypto expects the tag appended to the ciphertext; Node hands it back
    // separately, which is why it is stored separately and joined here.
    const parts = [fromBase64Url(body), fromBase64Url(tag)];
    const cipher = new Uint8Array(new ArrayBuffer(parts[0].length + parts[1].length));
    cipher.set(parts[0]);
    cipher.set(parts[1], parts[0].length);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(iv) },
      key,
      cipher,
    );
    return new TextDecoder().decode(plain);
  } catch {
    // A secret encrypted under a key we no longer hold cannot be recovered, and
    // guessing is not an option. The endpoint fails until it is rotated.
    return null;
  }
}

/**
 * Bytes from base64url. Typed against a plain `ArrayBuffer` rather than the
 * default `ArrayBufferLike`, because WebCrypto refuses a view that might be
 * backed by shared memory.
 */
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  return toBytes(atob(padded));
}

function toBytes(binary: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function signingKey(): Promise<CryptoKey | null> {
  const raw = Deno.env.get("WEBHOOK_SECRET_KEY") ?? "";
  if (raw === "") return null;
  const bytes = toBytes(atob(raw));
  if (bytes.length !== 32) return null;
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["decrypt"]);
}

/** HMAC-SHA256 over `<timestamp>.<body>`, which is what the docs tell receivers to check. */
async function sign(secret: string, timestamp: number, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Sends one event to every active endpoint the user has subscribed to it.
 *
 * Never throws. A delivery problem is the receiver's, and letting it surface
 * here would fail the provider callback that was only passing through, which
 * would cost the user the render itself.
 */
export async function deliverEvent(
  admin: SupabaseClient,
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  traceId: string | null,
): Promise<void> {
  try {
    const key = await signingKey();
    if (!key) return;

    const { data } = await admin
      .from("user_webhooks")
      .select("id, url, secret_encrypted")
      .eq("user_id", userId)
      .eq("is_active", true)
      .contains("events", [event]);

    const endpoints = (data ?? []) as Endpoint[];
    if (endpoints.length === 0) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event, created_at: new Date().toISOString(), data: payload });

    await Promise.all(
      endpoints.map((endpoint) => deliver(admin, endpoint, event, body, timestamp, key, traceId)),
    );
  } catch (error) {
    log("error", "webhook delivery could not run", {
      traceId,
      event,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

async function deliver(
  admin: SupabaseClient,
  endpoint: Endpoint,
  event: WebhookEvent,
  body: string,
  timestamp: number,
  key: CryptoKey,
  traceId: string | null,
): Promise<void> {
  const secret = await decrypt(endpoint.secret_encrypted, key);
  if (!secret) {
    await countFailure(admin, endpoint.id);
    log("error", "webhook secret could not be recovered", { traceId, webhookId: endpoint.id });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [EVENT_HEADER]: event,
        [TIMESTAMP_HEADER]: String(timestamp),
        [SIGNATURE_HEADER]: `t=${timestamp},v1=${await sign(secret, timestamp, body)}`,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      await countFailure(admin, endpoint.id);
      log("warn", "webhook rejected", {
        traceId,
        webhookId: endpoint.id,
        status: response.status,
      });
      return;
    }

    // Success clears the count: what matters is whether an endpoint is failing
    // now, not how many times it ever has.
    await admin
      .from("user_webhooks")
      .update({ last_delivery_at: new Date().toISOString(), failure_count: 0 })
      .eq("id", endpoint.id);
  } catch {
    await countFailure(admin, endpoint.id);
    log("warn", "webhook could not be reached", { traceId, webhookId: endpoint.id });
  } finally {
    clearTimeout(timer);
  }
}

async function countFailure(admin: SupabaseClient, id: string): Promise<void> {
  await admin.rpc("count_webhook_failure", { p_webhook: id });
}
