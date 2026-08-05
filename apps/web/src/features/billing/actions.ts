"use server";

import Stripe from "stripe";
import { z } from "zod";

import { env, isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { STRIPE_PRICES, isBillingConfigured, serverEnv } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const checkoutSchema = z.object({ plan: z.enum(["creator", "studio"]) });

export type CheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/**
 * Starts a Stripe Checkout session for a plan.
 *
 * Card details are collected by Stripe on their own hosted page: this app never
 * sees or stores a card number, which is both the secure option and what keeps
 * PCI scope off us entirely.
 */
export async function startCheckout(
  input: z.input<typeof checkoutSchema>,
): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Unknown plan" };
  if (!isBillingConfigured || !isSupabaseConfigured) return { status: "unconfigured" };

  const priceId = STRIPE_PRICES[parsed.data.plan];
  if (!priceId) return { status: "unconfigured" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { status: "error", message: "Sign in to upgrade" };

    const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      // Carried through the webhook so the subscription lands on the right
      // account even though Stripe knows nothing about our user ids.
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id, plan: parsed.data.plan } },
      success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/settings/usage?upgraded=1`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    if (!session.url) return { status: "error", message: "Could not start checkout" };
    return { status: "redirect", url: session.url };
  } catch (error) {
    logger.error("checkout failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not start checkout" };
  }
}

/** Opens Stripe's billing portal so a customer can manage or cancel. */
export async function openBillingPortal(): Promise<CheckoutResult> {
  if (!isBillingConfigured || !isSupabaseConfigured) return { status: "unconfigured" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Sign in to manage billing" };

    const service = createServiceClient();
    const { data } = await service
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const customerId = (data as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) return { status: "error", message: "No subscription to manage" };

    const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/settings/usage`,
    });
    return { status: "redirect", url: session.url };
  } catch (error) {
    logger.error("billing portal failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not open billing portal" };
  }
}

