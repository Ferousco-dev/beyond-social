import { Play } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { getProductAnalytics } from "@/lib/dashboard/analytics-queries";
import { getCredits, getHistory, getProjectGroups } from "@/lib/dashboard/queries";

import { HistoryList } from "./overview/history-list";
import { ActivityChart } from "./overview/activity-chart";
import { PlatformBars } from "./overview/platform-bars";
import { StatTiles } from "./overview/stat-tiles";
import { ScheduledPosts } from "./scheduled-posts";

/** Below this share of the allowance the quota is worth calling out. */
const LOW_CREDIT_PERCENT = 25;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export async function DashboardOverview(): Promise<ReactNode> {
  const [credits, projectGroups, history, analytics] = await Promise.all([
    getCredits(),
    getProjectGroups(),
    getHistory(),
    getProductAnalytics(),
  ]);
  const activeProjects = projectGroups.flatMap((group) => group.projects).slice(0, 3);
  const remaining = credits.total - credits.used;
  const remainingPercent = Math.round((remaining / credits.total) * 100);
  const low = remainingPercent <= LOW_CREDIT_PERCENT;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">What you have made and where it went.</p>

      <div className="mt-6">
        <StatTiles analytics={analytics} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-hairline bg-paper p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Videos generated</h2>
          <p className="mb-3 text-xs text-ink-soft">Last 7 days</p>
          <ActivityChart series={analytics.daily} />
        </div>

        <div className="rounded-2xl border border-hairline bg-paper p-5">
          <h2 className="text-sm font-semibold text-ink">Published by platform</h2>
          <p className="mb-3 text-xs text-ink-soft">All time</p>
          <PlatformBars totals={analytics.platforms} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-hairline bg-paper p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-ink-soft">Video credits</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {remaining}
              <span className="text-base font-normal text-ink-soft"> / {credits.total} left</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-ink-soft">Resets in {credits.resetsInDays} days</p>
            {low ? (
              <a
                href="/dashboard/settings/billing"
                className="inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-xs font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Upgrade
              </a>
            ) : null}
          </div>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={credits.total}
          aria-valuenow={remaining}
          aria-label="Video credits remaining"
          className="mt-3 h-2 overflow-hidden rounded-full bg-cloud"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${remainingPercent}%` }}
          />
        </div>
      </div>

      <Section title="Active projects">
        <div className="grid gap-4 sm:grid-cols-3">
          {activeProjects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/c/${project.id}` as Route}
              className="rounded-xl border border-hairline bg-paper p-2.5 transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="flex aspect-video items-center justify-center rounded-lg bg-cloud">
                <Play className="size-4 text-ink-soft" aria-hidden />
              </div>
              <p className="mt-2.5 truncate text-sm font-medium text-ink">{project.title}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Generation history">
        <HistoryList initialItems={history} />
      </Section>

      {/* Owns its own heading, so it is not wrapped in a Section. */}
      <section className="mt-8">
        <ScheduledPosts />
      </section>
    </div>
  );
}
