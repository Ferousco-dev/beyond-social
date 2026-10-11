import { Download } from "lucide-react";

import Link from "next/link";

import { getCurrentPlan } from "@/lib/billing/current-plan";

import { getUsageReport } from "../lib/queries";
import { rangeLabel, type UsageRangeId } from "../lib/range";
import { CreditChart } from "./credit-chart";
import { ModelBreakdown } from "./model-breakdown";
import { ModelCalls } from "./model-calls";
import { RangeTabs } from "./range-tabs";
import { UsageEmpty } from "./usage-empty";
import { UsageTotals } from "./usage-totals";

/** API usage for the signed-in user, priced in credits. */
export async function UsagePage({ range }: { range: UsageRangeId }) {
  const [report, plan] = await Promise.all([getUsageReport(range), getCurrentPlan()]);

  return (
    // The frame and the "Settings" title come from the settings layout.
    <section className="mt-6 lg:mt-8">
      <p className="text-sm text-ink-soft">
        What you spent, last {rangeLabel(range)}. Times are shown in {report.timeZone}.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <RangeTabs active={range} />
        {report.hasData ? (
          <a
            href={`/dashboard/settings/usage/export?range=${range}`}
            download
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline px-4 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </a>
        ) : null}
      </div>

      {report.hasData ? (
        <>
          <UsageTotals report={report} range={range} />
          <CreditChart days={report.days} />
          <ModelBreakdown models={report.models} />
          <ModelCalls calls={report.calls} />
        </>
      ) : (
        <UsageEmpty range={range} />
      )}

      {/* Plan and top-ups live in Settings > Billing, so there is one place to
          change a subscription rather than two that can disagree. */}
      <p className="mt-8 text-xs text-ink-soft">
        You are on the <span className="capitalize text-ink">{plan}</span> plan. Credits never
        expire.{" "}
        <Link
          href="/dashboard/settings/billing"
          className="text-ink underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Manage billing
        </Link>
      </p>
    </section>
  );
}
