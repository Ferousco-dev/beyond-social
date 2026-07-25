/**
 * Token-bucket limiter, applied before a request is sent so we shed load at our
 * own edge rather than paying for a provider 429. A bucket refills continuously,
 * which lets a caller burst up to `capacity` and then settle to `refillPerSec`.
 *
 * This is in-process. It is correct for a single worker and approximate across
 * a horizontally scaled fleet; the `RateLimiter` interface is the seam where a
 * Redis-backed implementation drops in when that matters.
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** How long the caller should wait before trying again. */
  retryAfterMs: number;
}

export interface RateLimiter {
  take(key: string, cost?: number): RateLimitDecision;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface TokenBucketOptions {
  capacity: number;
  refillPerSec: number;
  now?: () => number;
}

export class TokenBucketLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly now: () => number;

  constructor(private readonly options: TokenBucketOptions) {
    this.now = options.now ?? Date.now;
  }

  take(key: string, cost = 1): RateLimitDecision {
    const now = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.options.capacity, updatedAt: now };

    const elapsedSec = Math.max(0, now - bucket.updatedAt) / 1000;
    const refilled = Math.min(
      this.options.capacity,
      bucket.tokens + elapsedSec * this.options.refillPerSec,
    );

    if (refilled < cost) {
      this.buckets.set(key, { tokens: refilled, updatedAt: now });
      const deficit = cost - refilled;
      return {
        allowed: false,
        retryAfterMs: Math.ceil((deficit / this.options.refillPerSec) * 1000),
      };
    }

    this.buckets.set(key, { tokens: refilled - cost, updatedAt: now });
    return { allowed: true, retryAfterMs: 0 };
  }
}

/** Never refuses. Used when a deployment has no limiter configured. */
export class NoopLimiter implements RateLimiter {
  take(): RateLimitDecision {
    return { allowed: true, retryAfterMs: 0 };
  }
}

export class RateLimitedError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(`Rate limited; retry in ${retryAfterMs}ms`);
    this.name = "RateLimitedError";
  }
}
