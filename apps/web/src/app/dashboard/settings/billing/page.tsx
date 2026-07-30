import { type Metadata } from "next";

import { UpgradePanel } from "@/features/billing/components/upgrade-panel";
import { getCurrentPlan } from "@/lib/billing/current-plan";
import { PLAN_CATALOGUE, PLANS, priceLabel, type PlanId } from "@/lib/billing/plans";
import { dayCount } from "@/lib/dashboard/analytics";
import { isBillingConfigured } from "@/lib/server-env";
import { getCredits } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

function asPlanId(value: string): PlanId {
  return (PLANS as readonly string[]).includes(value) ? (value as PlanId) : "free";
}

export default async function BillingPage() {
  const [planId, credits] = await Promise.all([getCurrentPlan(), getCredits()]);
  const plan = PLAN_CATALOGUE[asPlanId(planId)];
  const remaining = Math.max(credits.total - credits.used, 0);
  const usedPercent = credits.total > 0 ? Math.round((credits.used / credits.total) * 100) : 0;

  return (
    <section className="mt-8">
      <div className="rounded-xl border border-hairline bg-paper p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Current plan</h2>
            <p className="mt-1 text-2xl font-semibold text-ink">{plan.name}</p>
          </div>
          {/* Only shown when there is a figure to show. On the free plan the
              price repeated the plan name, so the card read "Free ... Free". */}
          {plan.priceUsd > 0 ? (
            <p className="text-sm tabular-nums text-ink-soft">{priceLabel(plan)} / month</p>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-ink-soft">Video credits</span>
            <span className="tabular-nums text-ink">
              {remaining} of {credits.total} left
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={credits.total}
            aria-valuenow={credits.used}
            aria-label="Video credits used"
            className="mt-2 h-2 overflow-hidden rounded-full bg-cloud"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Credits reset in {dayCount(credits.resetsInDays)}.
          </p>
        </div>
      </div>

      {/* Owns its own heading and the billing-portal button. */}
      <UpgradePanel currentPlan={planId} checkoutReady={isBillingConfigured} />
    </section>
  );
}
