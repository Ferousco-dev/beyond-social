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

export type SharedLimitOptions = Pick<RateLimitPolicy, "limit" | "windowSeconds" | "bucket"> &
  Partial<Pick<RateLimitPolicy, "onUnavailable">>;

export class SupabaseRateLimiter implements RateLimiter {
  private readonly limiter = new SharedRateLimiter({
    store: supabaseRateLimitStore(),
    onUnavailable: ({ bucket, error }) => {
      /*
       * An error rather than a warning, and the severity is the point.
       *
       * This used to fail open and log a warning, arguing that a database blip
       * should not take every AI feature offline. That argument loses to what
       * failing open actually means here: model calls carry on with nothing
       * counting them, on a fleet where the only remaining limiter is per warm
       * instance. A ceiling that stops applying exactly when the database is
       * unwell is not a ceiling, and the bill does not care.
       *
       * It denies now, and this line is what tells somebody why the AI features
       * went quiet. The most likely cause is a service-role key that does not
       * match the database it is pointed at.
       */
      logger.error("shared AI rate limit unavailable, denying", { bucket, error });
    },
  });

  constructor(private readonly options: SharedLimitOptions) {}

  async take(key: string): Promise<RateLimitDecision> {
    const outcome = await this.limiter.checkPolicy(
      { onUnavailable: "closed", ...this.options },
      key,
    );
    return { allowed: outcome.ok, retryAfterMs: outcome.retryAfterMs };
  }
}
