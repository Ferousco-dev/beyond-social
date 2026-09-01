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

  /**
   * Charges tokens that were spent after the fact, without the option of
   * refusing. Optional, so a limiter written before this existed still works.
   *
   * A request is admitted on the size of its prompt, because that is all that
   * is known beforehand. The completion is the other half of the bill and is
   * frequently the larger one, so a limiter that only ever charges the prompt
   * lets a caller spend an unbounded amount from a small ask. `take` cannot do
   * this job: when the bucket is short it refuses and deducts nothing, which is
   * right for admission and wrong for a debt that has already been incurred.
   * Settling drives the bucket negative instead, and the next caller waits for
   * it to climb back.
   */
  settle?(key: string, cost: number): void | Promise<void>;
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

  /**
   * Settles against every tier, unlike `take`, which stops at the first
   * refusal. A tier that admitted the request has to be told what it really
   * cost, and there is no refusal to short-circuit on.
   */
  async settle(key: string, cost: number): Promise<void> {
    for (const limiter of this.limiters) {
      await limiter.settle?.(key, cost);
    }
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

  /** Tokens available now, after continuous refill since the last touch. */
  private refill(key: string, now: number): number {
    const bucket = this.buckets.get(key) ?? { tokens: this.options.capacity, updatedAt: now };
    const elapsedSec = Math.max(0, now - bucket.updatedAt) / 1000;
    return Math.min(this.options.capacity, bucket.tokens + elapsedSec * this.options.refillPerSec);
  }

  settle(key: string, cost: number): void {
    if (cost <= 0) return;
    const now = this.now();
    /*
     * Floored at one capacity of debt. An unbounded negative balance would let
     * a single enormous completion lock a caller out for hours, which punishes
     * far past the point of shedding load; a full bucket's worth of waiting is
     * already a strong signal.
     */
    const tokens = Math.max(-this.options.capacity, this.refill(key, now) - cost);
    this.buckets.set(key, { tokens, updatedAt: now });
  }

  take(key: string, cost = 1): RateLimitDecision {
    const now = this.now();
    const refilled = this.refill(key, now);

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

  settle(): void {}
}

export class RateLimitedError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(`Rate limited; retry in ${retryAfterMs}ms`);
    this.name = "RateLimitedError";
  }
}
