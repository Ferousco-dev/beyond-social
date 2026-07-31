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
  /**
   * May be synchronous or not. The in-process bucket answers immediately; a
   * shared limiter has to ask something over a network, and forcing that to be
   * synchronous is what pushes people into keeping limits per instance.
   */
  take(key: string, cost?: number): RateLimitDecision | Promise<RateLimitDecision>;
}

/**
 * Applies several limiters in order, and stops at the first refusal.
 *
 * The point is that they are not redundant. A local token bucket costs nothing
 * and stops an obvious flood before it leaves the process; a shared counter
 * costs a round trip and is the only thing that can enforce a real quota across
 * a fleet where every instance has its own memory. Cheapest first, so the common
 * case never pays for the expensive one.
 */
export class TieredLimiter implements RateLimiter {
  constructor(private readonly limiters: readonly RateLimiter[]) {}

  async take(key: string, cost = 1): Promise<RateLimitDecision> {
    for (const limiter of this.limiters) {
      const decision = await limiter.take(key, cost);
      if (!decision.allowed) return decision;
    }
    return { allowed: true, retryAfterMs: 0 };
  }
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
