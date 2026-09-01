import { BudgetExceededError, RateLimitedError } from "@beyond-social/ai-gateway";

/** Rounds a wait up to whole minutes, which is how a person reads a delay. */
function waitFor(retryAfterMs: number): string {
  const minutes = Math.ceil(retryAfterMs / 60_000);
  if (minutes <= 1) return "a moment";
  return `${minutes} minutes`;
}

/**
 * A person-readable reason for the two ways the gateway refuses on purpose, or
 * null for anything else.
 *
 * Both of these are the system working, not breaking, and they read very
 * differently to somebody using the product: "that could not be sent, try
 * again" invites an immediate retry that will be refused in exactly the same
 * way. Saying which limit was reached, and roughly how long it lasts, is the
 * difference between a wait and a fault.
 *
 * Deliberately vague about the numbers. The ceiling is denominated in what the
 * models cost us, which is not a figure anybody using the product has a way to
 * reason about, and publishing it invites gaming it.
 */
export function aiLimitMessage(error: unknown): string | null {
  if (error instanceof RateLimitedError) {
    return `That is more than we can process right now. Try again in ${waitFor(error.retryAfterMs)}.`;
  }
  if (error instanceof BudgetExceededError) {
    return "You have reached today's limit for AI assistance. It resets within 24 hours, and anything already saved is unaffected.";
  }
  return null;
}
