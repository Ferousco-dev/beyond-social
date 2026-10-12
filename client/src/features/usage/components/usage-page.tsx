import { Download } from "lucide-react";



import { getUsageReport } from "../lib/queries";
import { rangeLabel, type UsageRangeId } from "../lib/range";
import { CreditChart } from "./credit-chart";
import { RangeTabs } from "./range-tabs";
import { UsageEmpty } from "./usage-empty";
import { UsageTotals } from "./usage-totals";

/** API usage for the signed-in user, priced in credits. */
export async function UsagePage({ range }: { range: UsageRangeId }) {
  const report = await getUsageReport(range);

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
        </>
      ) : (
        <UsageEmpty range={range} />
      )}

      <p className="mt-8 text-xs text-ink-soft">Credits never expire.</p>
    </section>
  );
}
