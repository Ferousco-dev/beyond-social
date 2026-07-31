import { type Metadata } from "next";

import { BalanceCard } from "@/features/billing/components/balance-card";
import { CreditPackGrid } from "@/features/billing/components/credit-pack-grid";
import { PlanSummary } from "@/features/billing/components/plan-summary";
import { TransactionHistory } from "@/features/billing/components/transaction-history";
import { UpgradePanel } from "@/features/billing/components/upgrade-panel";
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
  // does my balance buy" has to be chosen rather than assumed.
  const cheapest = models.reduce<CatalogModel | null>(
    (best, model) => (best === null || model.creditCost < best.creditCost ? model : best),
    null,
  );

  return (
    <section className="mt-6 lg:mt-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <BalanceCard balance={balance} cheapest={cheapest} />
        <PlanSummary plan={plan} models={models} />
      </div>

      <CreditPackGrid checkoutReady={isBillingConfigured} />

      {/* Owns its own heading and the billing-portal button. */}
      <UpgradePanel currentPlan={planId} checkoutReady={isBillingConfigured} />

      <TransactionHistory entries={entries} timeZone={timeZone} />
    </section>
  );
}
