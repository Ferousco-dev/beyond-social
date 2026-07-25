import "server-only";

import { TokenBucketLimiter } from "@beyond-social/ai-gateway";

/**
 * Rate limiting for the public API.
 *
 * Read endpoints are cheap but not free, and an unthrottled key can still
 * exhaust the database. Reuses the gateway's token bucket so there is one
 * limiter implementation in the codebase rather than two that drift.
 *
 * In-process, so correct for a single instance and approximate across a fleet.
 * Swapping in Redis means changing this module only.
 */
const limiter = new TokenBucketLimiter({
  // 60 requests of burst, refilling at one per second.
  capacity: 60,
  refillPerSec: 1,
});

export interface RateLimitOutcome {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkApiRateLimit(callerId: string): RateLimitOutcome {
  const decision = limiter.take(`api:${callerId}`);
  return {
    allowed: decision.allowed,
    retryAfterSeconds: Math.ceil(decision.retryAfterMs / 1000),
  };
}
