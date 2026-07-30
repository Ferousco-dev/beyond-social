import "server-only";

import { type RateLimitDecision, type RateLimiter } from "@beyond-social/ai-gateway";

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * A rate limit that survives horizontal scaling.
 *
 * The in-process token bucket is correct for one worker and close to
 * meaningless on serverless: every instance keeps its own bucket, so a limit of
 * 60 an hour becomes 60 an hour *per warm instance*, and a cold start hands out
 * a fresh allowance. The database is the only thing every instance agrees on,
 * which is what makes it the right place for the quota that actually matters.
 *
 * This is a fixed window rather than a bucket. A window is what a quota
 * conversation is usually about ("100 a day"), it is one statement in Postgres,
 * and its weakness, twice the limit across a window boundary, is acceptable for
 * a spend ceiling. The token bucket in front of it already smooths bursts.
 *
 * Runs with the service role because a limit the user could bypass by deleting
 * their own row would not be a limit. Nothing here reads user data: the key is a
 * hash-like identifier and the table holds only counters.
 */

export interface SharedLimitOptions {
  /** Requests allowed per window. */
  readonly limit: number;
  /** Window length in seconds. */
  readonly windowSeconds: number;
  /** Distinguishes limits that share a user key, e.g. `chat` from `generate`. */
  readonly bucket: string;
}

export class SupabaseRateLimiter implements RateLimiter {
  constructor(private readonly options: SharedLimitOptions) {}

  async take(key: string): Promise<RateLimitDecision> {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase.rpc("rate_limit_hit", {
        p_key: `${this.options.bucket}:${key}`,
        p_limit: this.options.limit,
        p_window_seconds: this.options.windowSeconds,
      });
      if (error) throw new Error(error.message);

      const row = (data as { allowed: boolean; retry_after_seconds: number }[] | null)?.[0];
      if (!row) return { allowed: true, retryAfterMs: 0 };

      return {
        allowed: row.allowed,
        retryAfterMs: Math.max(0, row.retry_after_seconds) * 1000,
      };
    } catch (error) {
      /*
       * Fails open, deliberately, and this is the one judgement call in the
       * file. Failing closed would turn a database blip into a total outage of
       * every AI feature, which is a bigger incident than the one being
       * prevented. The local token bucket is still in front of this, so an open
       * failure degrades to a per-instance limit rather than to no limit at all.
       */
      logger.warn("shared rate limit unavailable, allowing", {
        bucket: this.options.bucket,
        error: error instanceof Error ? error.message : String(error),
      });
      return { allowed: true, retryAfterMs: 0 };
    }
  }
}
