import "server-only";

import { logger } from "@/lib/logger";
import { rateLimit as memoryLimit, type RateLimitResult } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Rate limiting that holds across instances.
 *
 * The in-memory limiter is per-instance, so on serverless an attacker spreading
 * attempts across instances gets a fresh budget each time. For auth that is the
 * difference between a throttle and a decoration, because credential stuffing
 * and OTP brute force are exactly the attacks it exists to stop.
 *
 * Falls back to the in-memory limiter when there is no service-role connection,
 * so local development and the unconfigured state still throttle something.
 */

/**
 * Fails **closed** on a database error.
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

  try {
    const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(Math.round(windowMs / 1000), 1),
    });
    if (error) throw new Error(error.message);

    const row = (Array.isArray(data) ? data[0] : data) as
      { allowed: boolean; remaining: number; retry_after_seconds: number } | undefined;
    if (!row) throw new Error("rate limiter returned no row");

    return {
      ok: row.allowed,
      remaining: row.remaining,
      retryAfterMs: row.retry_after_seconds * 1000,
      ...(row.allowed ? {} : { reason: "throttled" as const }),
    };
  } catch (error) {
    // Logged as an error, not a warning: this is a broken dependency wearing a
    // rate limit's clothes, and it will keep denying every request until someone
    // notices. The most likely cause is a service-role key that does not match
    // the database it is pointed at.
    logger.error("shared rate limiter unavailable, denying", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, remaining: 0, retryAfterMs: windowMs, reason: "unavailable" };
  }
}
