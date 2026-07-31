// Fixed-window rate limiter. In-memory and per-instance: a solid first line of
// defense, but production should back this with a shared store (Upstash/Redis)
// so limits hold across serverless instances. See docs/production-readiness.md.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
  /**
   * Why the request was refused, when it was.
   *
   * `throttled` means the caller genuinely exceeded the limit and waiting will
   * help. `unavailable` means the limiter itself could not answer and we denied
   * by default, where waiting helps nobody: the fix is configuration, not
   * patience. Telling someone to wait a minute for a limiter that never counted
   * them sends them to do nothing, repeatedly.
   */
  reason?: "throttled" | "unavailable";
}

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
