import { z } from "zod";

/**
 * Why a run was refused. The only thing a user can fix by paying is the balance;
 * there are no plans or tiers to unlock.
 */
export const DENIAL_REASONS = [
  "not_authenticated",
  "unknown_model",
  "model_inactive",
  /** The balance does not cover it. */
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
  insufficient_credits: "Not enough credits for this run. Top up to continue.",
  check_failed: "Could not check your credits. Try again in a moment.",
};

/** Denials an upgrade actually fixes, as opposed to signing in again or retrying. */
const UPGRADE_REASONS: ReadonlySet<DenialReason> = new Set(["insufficient_credits"]);

export function isUpgradeReason(reason: DenialReason): boolean {
  return UPGRADE_REASONS.has(reason);
}
