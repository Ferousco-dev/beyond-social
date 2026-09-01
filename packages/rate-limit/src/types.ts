/**
 * The vocabulary every limiting surface in the monorepo shares.
 *
 * There were three limiters before this package: an in-process token bucket in
 * the AI gateway, a Postgres counter behind the web auth flow, and a second
 * in-process bucket for the public API. Each had its own result shape, which is
 * why "is this throttled" was answered differently in each place and why the
 * admin console ended up with no answer at all.
 */

/** What happens when the counter itself cannot be reached. */
export type FailureMode = "closed" | "open";

export interface RateLimitPolicy {
  /** Attempts allowed inside one window. */
  readonly limit: number;
  /** Window length in seconds. Fixed window, not sliding. */
  readonly windowSeconds: number;
  /**
   * Namespaces the counter so two surfaces cannot share a key by accident.
   * Part of the stored key, so renaming one resets its counters.
   */
  readonly bucket: string;
  /**
   * Whether an unreachable counter denies or admits.
   *
   * Auth fails closed: an unavailable limiter must not become an open door on
   * the one surface that exists to stop credential stuffing. Cost controls fail
   * open: a database blip should not take every AI feature offline, and there
   * is a cheaper in-process limiter in front of them anyway.
   */
  readonly onUnavailable: FailureMode;
}

export type RefusalReason = "throttled" | "unavailable";

export interface RateLimitOutcome {
  readonly ok: boolean;
  readonly remaining: number;
  readonly retryAfterMs: number;
  /**
   * Why the request was refused, when it was.
   *
   * `throttled` means the caller genuinely exceeded the limit and waiting will
   * help. `unavailable` means the limiter could not answer and the policy chose
   * to deny, where waiting helps nobody: the fix is configuration, not patience.
   */
  readonly reason?: RefusalReason;
}

/** One atomic increment of a counter, as the database exposes it. */
export interface RateLimitHit {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

/**
 * The one thing a backing store has to do.
 *
 * Deliberately narrower than a Supabase client: this package stays free of any
 * app's environment, client construction and logger, so both Next apps can use
 * it by supplying a small adapter over the same `rate_limit_hit` function.
 */
export interface RateLimitStore {
  hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitHit>;
}
