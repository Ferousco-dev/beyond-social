import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage(): ReactNode {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Performance</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Analytics</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Published-video views, reach, impressions, engagement and account-specific posting recommendations will appear here when platform metrics are available.
      </p>

      <section className="mt-7 rounded-2xl border border-hairline bg-paper p-5 sm:p-7">
        <h2 className="text-base font-semibold text-ink">No performance data yet</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          This workspace does not currently receive analytics metrics from connected social accounts. No figures or posting-time recommendations are estimated on this page.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/connections"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Review social accounts
          </Link>
          <Link
            href="/dashboard/schedule"
            className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 text-sm font-medium text-ink hover:bg-cloud"
          >
            Open schedule
          </Link>
        </div>
      </section>
    </div>
  );
}
