import "server-only";

import { canRunModel } from "@/lib/credits/queries";
import { DENIAL_COPY } from "@/lib/credits/types";

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
  { readonly allowed: true } | { readonly allowed: false; readonly notice: string };

/** Denials name the dial that stopped the run, so the reply can offer the right remedy. */
export async function checkVideoRun(): Promise<RunGate> {
  const check = await canRunModel(DEFAULT_VIDEO_MODEL_ID);
  return check.allowed ? { allowed: true } : { allowed: false, notice: DENIAL_COPY[check.reason] };
}
