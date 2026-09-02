import {
  SharedRateLimiter,
  type RateLimitHit,
  type RateLimitOutcome,
  type RateLimitStore,
} from "@beyond-social/rate-limit";

import { createAuditWriter } from "./supabase";

/**
 * Sign-in throttling for the console.
 *
 * The console had none. A privileged surface with no throttle is a surface an
 * attacker can grind: credential stuffing costs them nothing, and the console
 * is the highest-value door in the product.
 *
 * The counter lives in the same `rate_limits` table the web app uses, reached
 * through the service role, because `rate_limit_hit` is granted to
 * `service_role` alone and a limit the caller could delete would not be a
 * limit. An in-process counter would be worse than nothing here: on serverless
 * it is per warm instance, so spreading attempts across instances resets it.
 */

function store(): RateLimitStore {
  return {
    async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitHit> {
      const { data, error } = await createAuditWriter().rpc("rate_limit_hit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (error) throw new Error(error.message);

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("rate limiter returned no row");

      return {
        allowed: row.allowed,
        remaining: row.remaining,
        retryAfterSeconds: row.retry_after_seconds,
      };
    },
  };
}

const limiter = new SharedRateLimiter({
  store: store(),
  onUnavailable: ({ bucket, error }) => {
    // Denying every sign-in until this is fixed is the correct outcome and a
    // loud one, so it is logged as an error rather than a warning.
    console.error(`admin sign-in limiter unavailable, denying (${bucket}): ${error}`);
  },
});

export interface SignInRefusal {
  readonly outcome: RateLimitOutcome;
  /**
   * Whether this refusal is worth an audit row. A flood of refused attempts
   * would otherwise become a flood of audit rows, and the log an incident is
   * read from is the wrong thing to let an attacker grow.
   */
  readonly audit: boolean;
}

/**
 * Counts one sign-in attempt against both scopes and returns the first refusal.
 *
 * Two scopes, because either alone leaves a hole. Per IP stops one host working
 * through a password list. Per account stops one account being ground down from
 * a rented pool of addresses, which is what credential stuffing actually looks
 * like. Both fail closed: an unavailable limiter must not become an open door
 * on the surface that exists to stop exactly this.
 */
export async function throttleSignIn(
  ip: string | null,
  email: string,
): Promise<SignInRefusal | null> {
  // A missing IP is one shared bucket rather than an exemption. Without it the
  // per-account limit is the only thing left, and unattributable attempts are
  // the ones most worth slowing down.
  const scope = ip ?? "unknown";

  const byIp = await limiter.check("adminSignInIp", scope);
  if (!byIp.ok) return { outcome: byIp, audit: await shouldAudit(scope) };

  const byAccount = await limiter.check("adminSignInAccount", email.toLowerCase());
  if (byAccount.ok) return null;
  return { outcome: byAccount, audit: await shouldAudit(scope) };
}

/** True at most once per window per scope, so the audit log records the attack
 *  without being the thing that carries it. */
async function shouldAudit(scope: string): Promise<boolean> {
  return (await limiter.check("adminSignInAudit", scope)).ok;
}
