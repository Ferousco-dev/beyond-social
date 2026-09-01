import "server-only";

import { type RateLimitHit, type RateLimitStore } from "@beyond-social/rate-limit";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * The web app's binding between the shared limiter and the `rate_limits` table.
 *
 * Runs with the service role because a limit the caller could bypass by
 * deleting their own row would not be a limit, and `rate_limit_hit` is granted
 * to `service_role` alone. Nothing here reads user data: the key is a
 * caller-scoped identifier and the table holds only counters.
 */
export function supabaseRateLimitStore(): RateLimitStore {
  return {
    async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitHit> {
      const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (error) throw new Error(error.message);

      const row = (Array.isArray(data) ? data[0] : data) as
        { allowed: boolean; remaining: number; retry_after_seconds: number } | undefined;
      if (!row) throw new Error("rate limiter returned no row");

      return {
        allowed: row.allowed,
        remaining: row.remaining,
        retryAfterSeconds: row.retry_after_seconds,
      };
    },
  };
}
