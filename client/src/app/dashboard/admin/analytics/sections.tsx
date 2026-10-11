import { cache } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getActiveUsersDaily,
  getAiSpendByModel,
  getAiSpendDaily,
  getGenerationsDaily,
  getSignupsDaily,
  getSubscriptionsByPlan,
  getUserTotals,
} from "@/lib/dashboard/admin";
import { TrendChart } from "@/features/admin/components/trend-chart";
import { AiSpendTable } from "@/features/admin/components/ai-spend-table";

// Cached per request: SpendTile and AiSpendChart both need the daily spend
// series; PlansTile and PlansBadges both need the plan breakdown. Wrapping
// with React's request cache avoids firing the same RPC twice just because
// each lives in its own Suspense boundary.
const getAiSpendDailyCached = cache(getAiSpendDaily);
const getSubscriptionsByPlanCached = cache(getSubscriptionsByPlan);

export function TileSkeleton() {
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-16" />
    </div>
  );
}

export function PlansSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-24 rounded-full" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="h-48 w-full" />;
}

export function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export async function TotalsTiles() {
  const totals = await getUserTotals();
  return (
    <>
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
    </>
  );
}

export async function SpendTile({ days }: { days: number }) {
  const spendDaily = await getAiSpendDailyCached(days);
  const totalCost = spendDaily.reduce((sum, p) => sum + p.costUsd, 0);
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <p className="text-xs text-ink-soft">AI spend ({days}d)</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">${totalCost.toFixed(2)}</p>
    </div>
  );
}

export async function PlansTile() {
  const plans = await getSubscriptionsByPlanCached();
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <p className="text-xs text-ink-soft">Plans represented</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{plans.length}</p>
    </div>
  );
}

export async function PlansBadges() {
  const plans = await getSubscriptionsByPlanCached();
  if (plans.length === 0) return null;
  return (
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
  );
}

export async function SignupsChart({ days }: { days: number }) {
  const signups = await getSignupsDaily(days);
  return <TrendChart series={[{ label: "Signups", color: "primary", fill: true, points: signups }]} />;
}

export async function ActiveUsersChart({ days }: { days: number }) {
  const actives = await getActiveUsersDaily(days);
  return (
    <TrendChart
      series={[
        { label: "Daily", color: "primary", points: actives.map((p) => ({ day: p.day, value: p.dau })) },
        {
          label: "Monthly",
          color: "ink-soft",
          points: actives.map((p) => ({ day: p.day, value: p.mau })),
        },
      ]}
    />
  );
}

export async function GenerationsChart({ days }: { days: number }) {
  const generations = await getGenerationsDaily(days);
  return (
    <TrendChart
      series={[
        {
          label: "Succeeded",
          color: "success",
          points: generations.map((p) => ({ day: p.day, value: p.succeeded })),
        },
        {
          label: "Failed",
          color: "destructive",
          points: generations.map((p) => ({ day: p.day, value: p.failed })),
        },
      ]}
    />
  );
}

export async function AiSpendChart({ days }: { days: number }) {
  const spendDaily = await getAiSpendDailyCached(days);
  return (
    <TrendChart
      series={[
        {
          label: "Spend",
          color: "primary",
          fill: true,
          points: spendDaily.map((p) => ({ day: p.day, value: p.costUsd })),
        },
      ]}
      format="currency"
    />
  );
}

export async function AiSpendByModel({ days }: { days: number }) {
  const spendByModel = await getAiSpendByModel(days);
  return <AiSpendTable rows={spendByModel} />;
}
