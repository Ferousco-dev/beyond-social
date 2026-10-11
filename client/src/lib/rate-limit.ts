import { type RateLimitOutcome } from "@beyond-social/rate-limit";

// Fixed-window rate limiter. In-memory and per-instance: a cheap first line of
// defence that costs no round trip. The limit that holds across a fleet lives in
// `@beyond-social/rate-limit`, and this stands in only where there is no shared
// store to reach, such as local development.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/**
 * Re-exported so the in-memory limiter and the shared one speak in one shape.
 * The two are interchangeable at the call site by design: this is the fallback
 * when there is no shared store to talk to.
 */
export type RateLimitResult = RateLimitOutcome;

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}
