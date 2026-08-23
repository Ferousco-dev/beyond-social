import "server-only";

import { canRunModel, cheapestRunCost } from "@/lib/credits/queries";
import { DENIAL_COPY, type DenialReason } from "@/lib/credits/types";

/**
 * The gate every video run passes through before the provider is called.
 *
 * Both dials are checked, and they are checked here rather than in the UI: the
 * composer can hide a button, but it cannot stop a request. `can_run_model` is
 * the authority, so the plan tier and the balance are evaluated by the database
 * against the caller's own session, not against anything the client sent.
 */

/**
 * The model a video run actually uses today.
 *
 * `supabase/functions/generate-video/index.ts` does not send a model, so
 * `createVideoTask` falls to its `veo3_fast` default and the generation row
 * falls to the same column default, which is what `complete_generation` prices
 * from. Checking any other model would gate a run against a price and a tier
 * that are not the ones charged. When the edge function starts forwarding a
 * chosen model, this constant is the thing that moves.
 */
export const DEFAULT_VIDEO_MODEL_ID = "veo3_fast";

export type RunGate =
  | {
      readonly allowed: true;
      /**
       * Said even though the run goes ahead: the balance this run leaves
       * behind cannot cover another one, so the moment to mention it is now,
       * while the account is still here to read it, not the next time they
       * try and find the gate refuses them cold.
       */
      readonly lowBalanceNotice: string | null;
    }
  | { readonly allowed: false; readonly notice: string; readonly reason: DenialReason };

/**
 * What to say about a balance that will not cover another run, or nothing.
 *
 * Pure so the threshold can be tested without a database: `remaining` is what
 * this run leaves behind and `floor` is the cheapest run left on any plan.
 * Below it there is no cheaper model to fall back to, on any tier, so that is
 * the one number that means the same "cliff" for every account.
 */
export function lowBalanceMessage(remaining: number, floor: number | null): string | null {
  if (floor === null || remaining >= floor) return null;
  const left = remaining <= 0 ? "credits" : `${remaining} credit${remaining === 1 ? "" : "s"}`;
  return `This uses your last ${left} for now. Top up to keep making videos.`;
}

/**
 * Denials name the dial that stopped the run, so the reply can offer the right
 * remedy.
 *
 * Takes the model actually being run rather than assuming the default. It was
 * fixed to `veo3_fast` back when nothing chose a model, so once the chooser
 * started naming Kling a thirty credit run would have been checked against a
 * six credit price: enough to pass the gate, not enough to pay for what it
 * then started.
 */
export async function checkVideoRun(modelId: string = DEFAULT_VIDEO_MODEL_ID): Promise<RunGate> {
  const check = await canRunModel(modelId);
  if (!check.allowed)
    return { allowed: false, notice: DENIAL_COPY[check.reason], reason: check.reason };

  /*
   * The only warning this account ever got was a hard refusal at the exact
   * moment a run could no longer be afforded, which is the latest possible
   * point to say so and the one time saying so cannot also offer a way to
   * avoid it.
   */
  const remaining = check.balance - check.creditCost;
  const floor = await cheapestRunCost();
  return { allowed: true, lowBalanceNotice: lowBalanceMessage(remaining, floor) };
}
