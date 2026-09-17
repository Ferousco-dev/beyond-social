import { type Metadata } from "next";
import { type ReactNode, Suspense } from "react";

import { AnalyticsExportButtons } from "@/features/admin/components/analytics-export";
import { AnalyticsRangeTabs } from "@/features/admin/components/analytics-range-tabs";
import {
  ActiveUsersChart,
  AiSpendByModel,
  AiSpendChart,
  ChartSkeleton,
  GenerationsChart,
  PlansBadges,
  PlansSkeleton,
  PlansTile,
  SignupsChart,
  SpendTile,
  TableSkeleton,
  TileSkeleton,
  TotalsTiles,
} from "./sections";

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-soft">Growth, engagement and AI spend trends.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AnalyticsRangeTabs active={days} />
          <AnalyticsExportButtons days={days} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense
          fallback={
            <>
              <TileSkeleton />
              <TileSkeleton />
            </>
          }
        >
          <TotalsTiles />
        </Suspense>
        <Suspense fallback={<TileSkeleton />}>
          <SpendTile days={days} />
        </Suspense>
        <Suspense fallback={<TileSkeleton />}>
          <PlansTile />
        </Suspense>
      </div>

      <Suspense fallback={<PlansSkeleton />}>
        <PlansBadges />
      </Suspense>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Signups">
          <Suspense fallback={<ChartSkeleton />}>
            <SignupsChart days={days} />
          </Suspense>
        </ChartCard>
        <ChartCard title="Active users">
          <Suspense fallback={<ChartSkeleton />}>
            <ActiveUsersChart days={days} />
          </Suspense>
        </ChartCard>
        <ChartCard title="Generations">
          <Suspense fallback={<ChartSkeleton />}>
            <GenerationsChart days={days} />
          </Suspense>
        </ChartCard>
        <ChartCard title="AI spend">
          <Suspense fallback={<ChartSkeleton />}>
            <AiSpendChart days={days} />
          </Suspense>
        </ChartCard>
      </div>

      <div className="mt-6">
        <Suspense fallback={<TableSkeleton />}>
          <AiSpendByModel days={days} />
        </Suspense>
      </div>
    </div>
  );
}
