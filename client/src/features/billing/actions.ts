"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { checkoutResponse } from "@/lib/go-api/schemas";

export type CheckoutResult = { readonly ok: true; readonly url: string } | { readonly ok: false; readonly message: string };

/** Starts a Stripe payment for a pack and returns the page to send the person to. */
export async function startCheckout(packId: string): Promise<CheckoutResult> {
  if (!z.string().uuid().safeParse(packId).success) return { ok: false, message: "Unknown pack." };
  const result = await goApi("/api/v1/credits/checkout", checkoutResponse, { method: "POST", body: { pack_id: packId } });
  return result.ok ? { ok: true, url: result.data.data.url } : { ok: false, message: result.message };
}

/** Starts a Pro membership and returns the Stripe page to pay on. */
export async function startSubscription(): Promise<CheckoutResult> {
  const result = await goApi("/api/v1/subscription/checkout", checkoutResponse, { method: "POST" });
  return result.ok ? { ok: true, url: result.data.data.url } : { ok: false, message: result.message };
}

/** Opens Stripe's page for changing a card or cancelling. */
export async function openBillingPortal(): Promise<CheckoutResult> {
  const result = await goApi("/api/v1/subscription/portal", checkoutResponse, { method: "POST" });
  return result.ok ? { ok: true, url: result.data.data.url } : { ok: false, message: result.message };
}

const overageSchema = z.object({ enabled: z.boolean(), cap: z.number().int().min(0).max(100_000) });

export async function saveOverage(input: z.input<typeof overageSchema>): Promise<{ readonly ok: boolean; readonly message?: string }> {
  const parsed = overageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a cap between 0 and 100000 credits." };
  const result = await goApi("/api/v1/usage/overage", z.unknown(), { method: "PUT", body: parsed.data });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/dashboard/usage");
  return { ok: true };
}
