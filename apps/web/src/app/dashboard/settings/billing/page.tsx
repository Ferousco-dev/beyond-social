import { type Metadata } from "next";

import { BillingSummary } from "@/features/billing/components/billing-summary";
import { CreditPackGrid } from "@/features/billing/components/credit-pack-grid";
import { ModelAccess } from "@/features/billing/components/model-access";
import { PlanPicker } from "@/features/billing/components/plan-picker";
import { TransactionHistory } from "@/features/billing/components/transaction-history";
import { getCreditHistory } from "@/features/billing/ledger";
import { getCurrentPlan } from "@/lib/billing/current-plan";
import { PLAN_CATALOGUE, PLANS, type PlanId } from "@/lib/billing/plans";
import { getCreditBalance } from "@/lib/credits/queries";
import { listModels } from "@/lib/models/catalog";
import { type CatalogModel } from "@/lib/models/types";
import { isBillingConfigured } from "@/lib/server-env";
import { getUserTimeZone } from "@/lib/time/user-zone";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

function asPlanId(value: string): PlanId {
  return (PLANS as readonly string[]).includes(value) ? (value as PlanId) : "free";
}

/**
 * Billing, as a credit system: one balance, one place to top it up, and the
 * ledger that explains both. The balance comes from `credit_balance()` rather
 * than the profile counters, because the ledger is the source of truth and the
 * counters are a cache of it.
 *
 * The page reads in the order the questions arrive: what am I on and what do I
 * have left, what else is there, what can I run with it, how do I get more,
 * where did it go. Each section is one surface, and only the header is allowed
 * to be loud.
 */
export default async function BillingPage() {
  const [planId, balance, models, entries, timeZone] = await Promise.all([
    getCurrentPlan(),
    getCreditBalance(),
    listModels(),
    getCreditHistory(),
    getUserTimeZone(),
  ]);

  const plan = PLAN_CATALOGUE[asPlanId(planId)];
  // The catalogue is ordered for display, not by price, so the anchor for "what
  // does my balance buy" has to be chosen rather than assumed. Scoped to
  // family=video and min_plan=free, the same floor `cheapestRunCost()` uses:
  // a model any plan can actually run, not just whichever row is priced
  // lowest across every family and tier, which could point at something this
  // user is locked out of.
  const cheapest = models.reduce<CatalogModel | null>(
    (best, model) =>
      model.family === "video" &&
      model.minPlan === "free" &&
      (best === null || model.creditCost < best.creditCost)
        ? model
        : best,
    null,
  );

  return (
    <section className="mt-6 lg:mt-8">
      <BillingSummary
        plan={plan}
        balance={balance}
        cheapest={cheapest}
        portalReady={isBillingConfigured}
      />

      <PlanPicker currentPlan={plan.id} checkoutReady={isBillingConfigured} />

      <ModelAccess plan={plan.id} models={models} />

      <CreditPackGrid checkoutReady={isBillingConfigured} />

      <TransactionHistory entries={entries} timeZone={timeZone} />
    </section>
  );
}
