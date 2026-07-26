import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { formatCount, trendPercent, type ProductAnalytics } from "@/lib/dashboard/analytics";
import { cn } from "@/lib/utils";

interface Stat {
  readonly label: string;
  readonly value: string;
  readonly delta?: number;
}

function buildStats(analytics: ProductAnalytics): readonly Stat[] {
  const { daily, funnel } = analytics;
  const weekGenerated = daily.reduce((total, day) => total + day.generated, 0);
  // Shown only once something has completed, so an empty account is not told
  // its success rate is zero percent.
  const successRate =
    funnel.generated > 0 ? `${Math.round((funnel.ready / funnel.generated) * 100)}%` : "--";

  return [
    { label: "Generated this week", value: formatCount(weekGenerated), delta: trendPercent(daily) },
    { label: "Ready", value: formatCount(funnel.ready) },
    { label: "Published", value: formatCount(funnel.published) },
    { label: "Success rate", value: successRate },
  ];
}

export function StatTiles({ analytics }: { analytics: ProductAnalytics }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {buildStats(analytics).map((stat) => {
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
