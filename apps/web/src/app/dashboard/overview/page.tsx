import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ActivityChart } from "@/features/dashboard/components/overview/activity-chart";
import { ActivityFeed } from "@/features/dashboard/components/overview/activity-feed";
import { AttentionPanel } from "@/features/dashboard/components/overview/attention-panel";
import { PeriodTiles } from "@/features/dashboard/components/overview/period-tiles";
import { PlatformBars } from "@/features/dashboard/components/overview/platform-bars";
import { RunningPanel } from "@/features/dashboard/components/overview/running-panel";
import { UpcomingPanel } from "@/features/dashboard/components/overview/upcoming-panel";
import { getProductAnalytics } from "@/lib/dashboard/analytics-queries";

import { getOverviewSnapshot } from "./queries";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The overview.
 *
 * Everything here is derived from our own tables. Views, reach and engagement
 * are absent because we do not have them: the platforms expose those through
 * insights APIs we have not integrated, and this screen used to show invented
 * versions of all three.
 */
export default async function OverviewPage(): Promise<ReactNode> {
  const [snapshot, analytics] = await Promise.all([getOverviewSnapshot(), getProductAnalytics()]);

  // A failure is the only thing on this page that needs a person today, so it
  // leads whenever there is one. Otherwise the running work does.
  const attentionFirst = snapshot.attention.total > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Overview</h1>
        <p className="mt-1 text-sm text-ink-soft">
          What is rendering, what goes out next, and what needs you.
        </p>
      </header>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {attentionFirst ? <AttentionPanel attention={snapshot.attention} /> : null}
        <RunningPanel running={snapshot.running} />
        <UpcomingPanel upcoming={snapshot.upcoming} timeZone={snapshot.timeZone} />
        {attentionFirst ? null : <AttentionPanel attention={snapshot.attention} />}
      </div>

      <div className="mt-3">
        <PeriodTiles counts={snapshot.counts} credits={snapshot.credits} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <section className="rounded-2xl border border-hairline bg-paper p-4 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Videos generated</h2>
            <p className="text-xs text-ink-soft">Last 7 days</p>
          </div>
          <div className="mt-4">
            <ActivityChart series={analytics.daily} />
          </div>
        </section>

        <section className="rounded-2xl border border-hairline bg-paper p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Published by platform</h2>
            <p className="text-xs text-ink-soft">All time</p>
          </div>
          <div className="mt-4">
            <PlatformBars totals={analytics.platforms} />
          </div>
        </section>
      </div>

      <div className="mt-8">
        <ActivityFeed events={snapshot.activity} timeZone={snapshot.timeZone} />
      </div>
    </div>
  );
}
