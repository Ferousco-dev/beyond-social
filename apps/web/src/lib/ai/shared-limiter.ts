import "server-only";

import { type RateLimitDecision, type RateLimiter } from "@beyond-social/ai-gateway";
import { SharedRateLimiter, type RateLimitPolicy } from "@beyond-social/rate-limit";

import { logger } from "@/lib/logger";
import { supabaseRateLimitStore } from "@/lib/rate-limit-store";

/**
 * The shared limiter wearing the AI gateway's `RateLimiter` interface.
 *
 * The gateway composes limiters with `TieredLimiter`: a free in-process bucket
 * sheds an obvious flood without a round trip, and this one enforces the quota
 * that actually holds across a fleet. Cheapest first, so the common case never
 * pays for the expensive one.
 */

export type SharedLimitOptions = Pick<RateLimitPolicy, "limit" | "windowSeconds" | "bucket">;

export class SupabaseRateLimiter implements RateLimiter {
  private readonly limiter = new SharedRateLimiter({
    store: supabaseRateLimitStore(),
    onUnavailable: ({ bucket, error }) => {
      logger.warn("shared rate limit unavailable, allowing", { bucket, error });
    },
  });

  constructor(private readonly options: SharedLimitOptions) {}

  async take(key: string): Promise<RateLimitDecision> {
    /*
     * Fails open, and this is the one judgement call in the file. Failing
     * closed would turn a database blip into a total outage of every AI
     * feature, which is a bigger incident than the one being prevented. The
     * local token bucket is still in front of this, so an open failure degrades
     * to a per-instance limit rather than to no limit at all.
     */
    const outcome = await this.limiter.checkPolicy({ ...this.options, onUnavailable: "open" }, key);
    return { allowed: outcome.ok, retryAfterMs: outcome.retryAfterMs };
  }
}
