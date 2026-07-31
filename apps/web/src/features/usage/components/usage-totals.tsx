import { Coins, RotateCcw, Video, Wallet } from "lucide-react";

import { formatCredits } from "../lib/format";
import { rangeLabel, type UsageRangeId } from "../lib/range";
import { type UsageReport } from "../lib/types";

function Tile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Coins;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

/** The period total, first thing on the page, in the currency the user holds. */
export function UsageTotals({ report, range }: { report: UsageReport; range: UsageRangeId }) {
  const net = report.totalCreditsSpent - report.totalCreditsRefunded;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label={`Credits used, last ${rangeLabel(range)}`}
        value={formatCredits(net)}
        hint={`${formatCredits(report.totalCreditsSpent)} charged`}
        icon={Coins}
      />
      <Tile
        label="Refunded"
        value={formatCredits(report.totalCreditsRefunded)}
        hint="Failed runs, returned automatically"
        icon={RotateCcw}
      />
      <Tile label="Runs" value={formatCredits(report.totalRuns)} icon={Video} />
      <Tile
        label="Balance"
        value={formatCredits(report.balance)}
        hint="Credits never expire"
        icon={Wallet}
      />
    </div>
  );
}
