import "server-only";

import type Stripe from "stripe";

import { logger } from "@/lib/logger";
import { grantCredits } from "@/lib/credits/grants";

import { CREDIT_PACKS } from "./credit-packs";

/**
 * Grants a one-time credit-pack purchase from the webhook.
 *
 * A payment-mode checkout has no follow-up event the way a subscription does
 * (there is no `customer.subscription.created` to carry the grant), so this is
 * the only place it happens. The session id is the idempotency key: Stripe
 * redelivers `checkout.session.completed` on retry, and `grantCredits`'
 * `externalRef` is what keeps that free rather than a second top-up.
 *
 * The pack id travels in `session.metadata`, set by whatever creates the
 * checkout session, not by anything here.
 */
export async function applyCreditPackPurchase(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id;
  const packId = session.metadata?.packId;
  const pack = CREDIT_PACKS.find((candidate) => candidate.id === packId);

  if (!userId || !pack) {
    logger.warn("credit pack checkout missing user or pack", {
      sessionId: session.id,
      userId,
      packId,
    });
    return;
  }

  const balance = await grantCredits({
    userId,
    amount: pack.credits,
    reason: `purchase:${pack.id}`,
    externalRef: `credit_pack_session:${session.id}`,
  });
  logger.info("credit pack granted", { sessionId: session.id, userId, packId: pack.id, balance });
}
