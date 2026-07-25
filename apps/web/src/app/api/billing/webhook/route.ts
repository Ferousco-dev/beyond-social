import { NextResponse } from "next/server";
import Stripe from "stripe";

import { PLAN_CATALOGUE, planForPrice, type PlanId } from "@/lib/billing/plans";
import { logger } from "@/lib/logger";
import { STRIPE_PRICES, isBillingConfigured, serverEnv } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Stripe webhook. Subscription state lives in Stripe; this projects it into our
 * database and grants the plan's credit allowance.
 *
 * Two things make it safe: the signature is verified against the raw body, so
 * only Stripe can drive it, and every event id is claimed in `billing_events`
 * before credits are granted, so an at-least-once redelivery cannot pay out
 * twice.
 */
export const dynamic = "force-dynamic";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request): Promise<NextResponse> {
  if (!isBillingConfigured) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await request.text();
  const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, serverEnv.STRIPE_WEBHOOK_SECRET);
  } catch {
    // An unverifiable body is either an attack or a misconfiguration; either way
    // it must not reach the database.
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true });

  try {
    const service = createServiceClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      if (userId && customerId) {
        await service.rpc("billing_link_customer", {
          p_user: userId,
          p_customer: customerId,
        } as never);
      }
      return NextResponse.json({ received: true });
    }

    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata.userId;
    if (!userId) {
      logger.warn("subscription without userId metadata", { id: subscription.id });
      return NextResponse.json({ received: true });
    }

    const priceId = subscription.items.data[0]?.price.id ?? "";
    const plan = planForPrice(priceId, STRIPE_PRICES);
    const planId: PlanId = plan?.id ?? "free";
    const credits = PLAN_CATALOGUE[planId].credits;
    const periodEnd = subscription.items.data[0]?.current_period_end ?? null;

    const { data, error } = await service.rpc("billing_apply_subscription", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_user: userId,
      p_subscription_id: subscription.id,
      p_status: subscription.status,
      p_price_id: priceId,
      p_plan: planId,
      p_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      p_cancel_at_period_end: subscription.cancel_at_period_end,
      p_credits: credits,
    } as never);

    if (error) throw new Error(error.message);
    // `false` means the event was a redelivery and was ignored, which is success.
    logger.info("billing event applied", { type: event.type, applied: data === true });
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("billing webhook failed", {
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
    // A 500 asks Stripe to retry, which is what we want for a transient fault.
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
