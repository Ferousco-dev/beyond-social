import { RATE_LIMIT_POLICIES, type RateLimitPolicyName } from "./policies";
import { type RateLimitOutcome, type RateLimitPolicy, type RateLimitStore } from "./types";

/** Reported when a policy denies because its store could not answer. */
export interface UnavailableReport {
  readonly bucket: string;
  readonly error: string;
}

export interface SharedRateLimiterOptions {
  readonly store: RateLimitStore;
  /**
   * Called when the store fails. The package has no logger of its own, and
   * inventing one would mean two log formats in the same request; the host app
   * knows how it wants this recorded and whether it is a warning or an error.
   */
  readonly onUnavailable?: (report: UnavailableReport) => void;
}

/**
 * The one limiter every surface uses.
 *
 * Fixed window rather than a bucket, because the store is a single atomic
 * upsert and a window is what a quota conversation is usually about. Its
 * weakness, up to twice the limit across a window boundary, is acceptable for
 * both throttling auth and capping spend.
 *
 * What makes this the primitive and not another one-off is that it holds across
 * instances. An in-process counter on serverless is per warm instance, so a
 * limit of ten an hour becomes ten an hour per instance and a cold start hands
 * out a fresh allowance. Spreading attempts across instances is exactly what
 * credential stuffing does.
 */
export class SharedRateLimiter {
  constructor(private readonly options: SharedRateLimiterOptions) {}

  /** Counts one attempt against a named policy. */
  async check(policy: RateLimitPolicyName, key: string): Promise<RateLimitOutcome> {
    return this.checkPolicy(RATE_LIMIT_POLICIES[policy], key);
  }

  /** Counts one attempt against a policy supplied directly, for callers whose
   *  limits come from somewhere other than the shared table. */
  async checkPolicy(policy: RateLimitPolicy, key: string): Promise<RateLimitOutcome> {
    try {
      const hit = await this.options.store.hit(
        `${policy.bucket}:${key}`,
        policy.limit,
        policy.windowSeconds,
      );

      return {
        ok: hit.allowed,
        remaining: Math.max(0, hit.remaining),
        retryAfterMs: Math.max(0, hit.retryAfterSeconds) * 1000,
        ...(hit.allowed ? {} : { reason: "throttled" as const }),
      };
    } catch (error) {
      this.options.onUnavailable?.({
        bucket: policy.bucket,
        error: error instanceof Error ? error.message : String(error),
      });

      if (policy.onUnavailable === "open") {
        return { ok: true, remaining: policy.limit, retryAfterMs: 0 };
      }
      return {
        ok: false,
        remaining: 0,
        retryAfterMs: policy.windowSeconds * 1000,
        reason: "unavailable",
      };
    }
  }
}
