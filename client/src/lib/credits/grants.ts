import "server-only";

import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * Granting credits: purchases and monthly plan allowances. Service role only,
 * because a client that could grant itself credits is not a paywall.
 */

export const grantInputSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().min(1),
  /**
   * The idempotency key, unique per real-world grant (a Stripe event id, a
   * checkout session). Webhooks are at-least-once, so without it a redelivery
   * is free money.
   */
  externalRef: z.string().min(1).optional(),
});
export type GrantInput = z.input<typeof grantInputSchema>;

/** Returns the balance after the grant, which is unchanged on a replay. */
export async function grantCredits(input: GrantInput): Promise<number> {
  const { userId, amount, reason, externalRef } = grantInputSchema.parse(input);

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("grant_credits", {
    p_user: userId,
    p_amount: amount,
    p_reason: reason,
    p_external_ref: externalRef,
  });
  if (error !== null) throw new Error(`grant_credits failed: ${error.message}`);

  return z.number().int().parse(data);
}
