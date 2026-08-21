import { z } from "zod";

/**
 * Access has two independent dials, and the reason says which one stopped the
 * run. Conflating them produces the worst possible message: telling someone to
 * buy credits for a model their plan will never unlock.
 */
export const DENIAL_REASONS = [
  "not_authenticated",
  "unknown_model",
  "model_inactive",
  /** The plan is too low. Buying credits will not help. */
  "plan_tier",
  /** The plan allows it; the balance does not cover it. */
  "insufficient_credits",
  /**
   * The database never answered, so nothing about the model or the balance is
   * known. Distinct from `unknown_model`: that one means the check ran and
   * found no such model, this one means the check itself did not run.
   */
  "check_failed",
] as const;
export type DenialReason = (typeof DENIAL_REASONS)[number];

export const runCheckSchema = z.object({
  allowed: z.boolean(),
  reason: z.union([z.literal("ok"), z.enum(DENIAL_REASONS)]),
  credit_cost: z.number().int().nonnegative(),
  balance: z.number().int(),
});

export type RunCheck =
  | { readonly allowed: true; readonly creditCost: number; readonly balance: number }
  | {
      readonly allowed: false;
      readonly reason: DenialReason;
      readonly creditCost: number;
      readonly balance: number;
    };

/** Copy for each denial, so the UI never has to interpret a reason code. */
export const DENIAL_COPY: Readonly<Record<DenialReason, string>> = {
  not_authenticated: "Sign in to run a model.",
  unknown_model: "That model is not in the catalogue.",
  model_inactive: "That model is not available right now.",
  plan_tier: "This model is on a higher plan. Upgrade to unlock it.",
  insufficient_credits: "Not enough credits for this run. Top up to continue.",
  check_failed: "Could not check your credits. Try again in a moment.",
};
