import "server-only";

import { SharedRateLimiter } from "@beyond-social/rate-limit";

import { logger } from "@/lib/logger";
import { rateLimit as memoryLimit, type RateLimitResult } from "@/lib/rate-limit";
import { supabaseRateLimitStore } from "@/lib/rate-limit-store";
import { serverEnv } from "@/lib/server-env";

/**
 * Rate limiting for auth, holding across instances.
 *
 * The in-memory limiter is per-instance, so on serverless an attacker spreading
 * attempts across instances gets a fresh budget each time. For auth that is the
 * difference between a throttle and a decoration, because credential stuffing
 * and OTP brute force are exactly the attacks it exists to stop.
 *
 * Falls back to the in-memory limiter when there is no service-role connection,
 * so local development and the unconfigured state still throttle something.
 */

const limiter = new SharedRateLimiter({
  store: supabaseRateLimitStore(),
  onUnavailable: ({ error }) => {
    // Logged as an error, not a warning: this is a broken dependency wearing a
    // rate limit's clothes, and it will keep denying every request until someone
    // notices. The most likely cause is a service-role key that does not match
    // the database it is pointed at.
    logger.error("shared rate limiter unavailable, denying", { error });
  },
});

/**
 * Fails **closed** on a database error, through the policy passed below.
 *
 * This is the opposite of the cache, and deliberately so: a broken cache should
 * cost money, but a broken limiter should not silently open the door. Auth
 * throttling is the one place where unavailable must mean denied.
 */
export async function sharedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (serverEnv.SUPABASE_SERVICE_ROLE_KEY === "") {
    return memoryLimit(key, limit, windowMs);
  }

  // Limits here are per action and set at the call site, so this is the one
  // surface whose policy is not a named entry in the shared table.
  return limiter.checkPolicy(
    {
      bucket: "auth",
      limit,
      windowSeconds: Math.max(Math.round(windowMs / 1000), 1),
      onUnavailable: "closed",
    },
    key,
  );
}
