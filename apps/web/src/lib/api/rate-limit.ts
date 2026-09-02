import "server-only";

import { TokenBucketLimiter } from "@beyond-social/ai-gateway";
import { SharedRateLimiter } from "@beyond-social/rate-limit";

import { logger } from "@/lib/logger";
import { supabaseRateLimitStore } from "@/lib/rate-limit-store";

/**
 * Rate limiting for the public API.
 *
 * Two tiers, and they are not redundant. The token bucket costs nothing and
 * sheds an obvious flood before it leaves the process. The shared counter costs
 * a round trip and is the only tier that means anything on serverless, where
 * every instance keeps its own memory: an attacker spreading requests across
 * instances gets a fresh bucket from each, so the in-process tier alone is a
 * limit per warm instance rather than a limit.
 *
 * Cheapest first, so a caller who is already over the burst never pays for the
 * database round trip.
 */

const burst = new TokenBucketLimiter({
  // 60 requests of burst, refilling at one per second.
  capacity: 60,
  refillPerSec: 1,
});

const shared = new SharedRateLimiter({
  store: supabaseRateLimitStore(),
  onUnavailable: ({ error }) => {
    logger.warn("public API rate limit unavailable, allowing", { error });
  },
});

export interface RateLimitOutcome {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkApiRateLimit(callerId: string): Promise<RateLimitOutcome> {
  const local = burst.take(`api:${callerId}`);
  if (!local.allowed) {
    return { allowed: false, retryAfterSeconds: Math.ceil(local.retryAfterMs / 1000) };
  }

  /*
   * Fails open, unlike the auth limiter, and the asymmetry is deliberate. An
   * unreachable counter here would take the whole public API offline for every
   * paying integration, which is a larger incident than the one being
   * prevented, and the in-process tier above still applies.
   */
  const outcome = await shared.check("publicApi", callerId);
  return { allowed: outcome.ok, retryAfterSeconds: Math.ceil(outcome.retryAfterMs / 1000) };
}
