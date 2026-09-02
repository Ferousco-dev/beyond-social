import { type RateLimitPolicy } from "./types";

/**
 * Every limit in the product, in one place.
 *
 * Policy is configuration, not code: a surface picks a name from this table and
 * the numbers are reviewable side by side. Previously they were literals spread
 * across four files, which is how the admin console came to have none.
 *
 * The numbers are per key, and the key is chosen by the caller: an IP for a
 * pre-authentication surface, a user or API key for an authenticated one.
 */
export const RATE_LIMIT_POLICIES = {
  /** Admin console sign-in, keyed per IP. Tighter than the web app: the
   *  population is a handful of staff, so a real admin never approaches it. */
  adminSignInIp: {
    bucket: "admin-signin-ip",
    limit: 10,
    windowSeconds: 600,
    onUnavailable: "closed",
  },
  /** Admin console sign-in, keyed per account. Stops one account being ground
   *  down from many addresses, which is what credential stuffing looks like. */
  adminSignInAccount: {
    bucket: "admin-signin-account",
    limit: 5,
    windowSeconds: 900,
    onUnavailable: "closed",
  },
  /** How often a throttled admin sign-in may write an audit row, keyed per IP.
   *  Without it a flood of refused attempts becomes a flood of audit rows, and
   *  the log an incident is read from is the wrong thing to let an attacker
   *  grow. Fails closed, meaning it stays quiet, because the refusal itself is
   *  already logged by the limiter. */
  adminSignInAudit: {
    bucket: "admin-signin-audit",
    limit: 1,
    windowSeconds: 900,
    onUnavailable: "closed",
  },
  /** Public API, keyed per calling user. Read endpoints are cheap but not free.
   *  Sized to match the sustained rate of the in-process bucket it now backs,
   *  one request a second, so no existing integration starts being refused. */
  publicApi: {
    bucket: "api",
    limit: 60,
    windowSeconds: 60,
    onUnavailable: "open",
  },
  /** Every AI gateway call, keyed per user. The spend ceiling.
   *
   *  Fails closed. An unreachable counter here means model calls are being made
   *  with nothing counting them, and a limiter that cannot count is not a
   *  ceiling. The operational cost is real, a database blip stops the AI
   *  features rather than degrading them, and it is the trade the audit asked
   *  for: unmetered spend on a serverless fleet has no upper bound, and the
   *  in-process bucket in front of this is per instance. */
  aiGateway: {
    bucket: "ai",
    limit: 150,
    windowSeconds: 600,
    onUnavailable: "closed",
  },
  /** Image classification on upload, keyed per user.
   *
   *  Fails closed like the gateway, because it is the same kind of thing: a
   *  paid model call. What the caller does with a refusal is what keeps this
   *  from breaking uploads. See `likeness.ts`: an unavailable limiter skips the
   *  model and resolves the likeness question the safe way instead, so no money
   *  is spent and nobody is blocked. */
  imageClassification: {
    bucket: "classify-image",
    limit: 60,
    windowSeconds: 600,
    onUnavailable: "closed",
  },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;
