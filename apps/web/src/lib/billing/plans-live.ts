import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { PLAN_CATALOGUE, PLANS, type Plan, type PlanId } from "./plans";

/**
 * PLAN_CATALOGUE with credits and priceUsd overlaid from app_config (area
 * "billing", seeded by migration 0122) when an admin has set them, falling
 * back to the hardcoded default otherwise, at request time. Only these two
 * fields can move: name, description, features and the Stripe price env var
 * references are not read from here and stay defined in code.
 *
 * Server-only and kept out of plans.ts on purpose: plans.ts is imported by
 * client components (plan-picker.tsx, landing-pricing.tsx via the separate
 * lib/marketing/plans.ts catalogue) that need PLAN_CATALOGUE as a plain
 * synchronous constant, and this file would poison that bundle.
 *
 * Not wired into any customer-facing surface yet. The marketing pricing page
 * reads a wholly separate, already-duplicated catalogue
 * (lib/marketing/plans.ts), and the in-app plan picker / checkout read
 * PLAN_CATALOGUE directly as client components. Rewiring either to this
 * live source is a bigger, separate change than "make credits and price
 * admin-editable" and was deliberately left as a follow-up rather than
 * half-connected here. Today this powers only the admin Config page's
 * effective-price preview, which is why a plain RLS-gated table read (not a
 * public RPC) is sufficient: only an admin session calls this.
 */
export async function getPlanCatalogue(): Promise<Readonly<Record<PlanId, Plan>>> {
  if (!isSupabaseConfigured) return PLAN_CATALOGUE;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_config")
    .select("key, value")
    .like("key", "billing.%");
  if (error || !data) return PLAN_CATALOGUE;

  const overrides = new Map<string, unknown>(data.map((row) => [row.key, row.value]));

  const result = {} as Record<PlanId, Plan>;
  for (const plan of PLANS) {
    const credits = overrides.get(`billing.${plan}.credits`);
    const priceUsd = overrides.get(`billing.${plan}.price_usd`);
    result[plan] = {
      ...PLAN_CATALOGUE[plan],
      credits: typeof credits === "number" ? credits : PLAN_CATALOGUE[plan].credits,
      priceUsd: typeof priceUsd === "number" ? priceUsd : PLAN_CATALOGUE[plan].priceUsd,
    };
  }
  return result;
}
