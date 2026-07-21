import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import {
  PLATFORM_REACH,
  VIEWS_LAST_7_DAYS,
  formatCount,
  trendPercent,
} from "@/lib/dashboard/analytics";
import { HISTORY } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

interface Stat {
  readonly label: string;
  readonly value: string;
  readonly delta?: number;
}

function buildStats(): readonly Stat[] {
  const weekViews = VIEWS_LAST_7_DAYS.reduce((total, day) => total + day.views, 0);
  const totalReach = PLATFORM_REACH.reduce((total, row) => total + row.views, 0);

  return [
    {
      label: "Views this week",
      value: formatCount(weekViews),
      delta: trendPercent(VIEWS_LAST_7_DAYS),
    },
    { label: "Total reach", value: formatCount(totalReach) },
    {
      label: "Published",
      value: String(HISTORY.filter((item) => item.status === "Published").length),
    },
    {
      label: "Scheduled",
      value: String(HISTORY.filter((item) => item.status === "Scheduled").length),
    },
  ];
}

export function StatTiles() {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {buildStats().map((stat) => {
        const rising = (stat.delta ?? 0) >= 0;
        const Arrow: LucideIcon = rising ? ArrowUpRight : ArrowDownRight;

        return (
          <div key={stat.label} className="rounded-xl border border-hairline bg-paper p-3.5">
            <dt className="truncate text-xs text-ink-soft">{stat.label}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums text-ink">{stat.value}</span>
              {stat.delta === undefined ? null : (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                    rising ? "text-success" : "text-destructive",
                  )}
                >
                  <Arrow className="size-3" aria-hidden />
                  {Math.abs(stat.delta)}%
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
