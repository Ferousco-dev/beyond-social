import { type Metadata } from "next";
import { type ReactNode } from "react";

import {
  getActiveUsersDaily,
  getAiSpendByModel,
  getAiSpendDaily,
  getGenerationsDaily,
  getSignupsDaily,
  getSubscriptionsByPlan,
  getUserTotals,
} from "@/lib/dashboard/admin";
import { AnalyticsRangeTabs } from "@/features/admin/components/analytics-range-tabs";
import { BarRow } from "@/features/admin/components/bar-row";
import { AiSpendTable } from "@/features/admin/components/ai-spend-table";

export const metadata: Metadata = { title: "Admin · Analytics" };

function ChartCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="rounded-xl border border-hairline bg-paper p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;

  const [totals, plans, signups, actives, generations, spendDaily, spendByModel] = await Promise.all([
    getUserTotals(),
    getSubscriptionsByPlan(),
    getSignupsDaily(days),
    getActiveUsersDaily(days),
    getGenerationsDaily(days),
    getAiSpendDaily(days),
    getAiSpendByModel(days),
  ]);

  const totalCost = spendDaily.reduce((sum, p) => sum + p.costUsd, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-soft">Growth, engagement and AI spend trends.</p>
        </div>
        <AnalyticsRangeTabs active={days} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-hairline bg-paper p-4">
          <p className="text-xs text-ink-soft">Total users</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {totals?.totalUsers.toLocaleString() ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-hairline bg-paper p-4">
          <p className="text-xs text-ink-soft">Active subscriptions</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
            {totals?.activeSubscriptions.toLocaleString() ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-hairline bg-paper p-4">
          <p className="text-xs text-ink-soft">AI spend ({days}d)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">${totalCost.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-hairline bg-paper p-4">
          <p className="text-xs text-ink-soft">Plans represented</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{plans.length}</p>
        </div>
      </div>

      {plans.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {plans.map((plan) => (
            <span
              key={plan.plan}
              className="rounded-full border border-hairline bg-paper px-3 py-1 text-xs text-ink"
            >
              {plan.plan}: {plan.subscriptions}
              {plan.trialing > 0 ? ` (${plan.trialing} trialing)` : ""}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Signups">
          <BarRow points={signups.map((p) => ({ day: p.day, value: p.value }))} />
        </ChartCard>
        <ChartCard title="Daily actives">
          <BarRow points={actives.map((p) => ({ day: p.day, value: p.dau }))} />
        </ChartCard>
        <ChartCard title="Generations">
          <BarRow points={generations.map((p) => ({ day: p.day, value: p.total }))} />
        </ChartCard>
        <ChartCard title="AI spend">
          <BarRow
            points={spendDaily.map((p) => ({ day: p.day, value: p.costUsd }))}
            formatValue={(v) => `$${v.toFixed(2)}`}
          />
        </ChartCard>
      </div>

      <div className="mt-6">
        <AiSpendTable rows={spendByModel} />
      </div>
    </div>
  );
}
