import { type ReactNode } from "react";

import { Card, Unavailable } from "@/components/ui/card";
import { Metric, MetricRow } from "@/components/ui/metric";
import { type GenerationsDay } from "@/lib/analytics";
import { formatCount } from "@/lib/format";

import { DaySeries } from "./day-series";

/**
 * Video generations over the window, split by outcome.
 *
 * Pending is reported separately rather than folded into either side, because
 * today's renders have not settled: on the current day the total exceeds
 * succeeded plus failed, and a success rate computed against it would read low
 * for reasons that have nothing to do with the provider.
 */
export function GenerationsPanel({
  generations,
  windowDays,
}: {
  generations: readonly GenerationsDay[] | null;
  windowDays: number;
}): ReactNode {
  if (!generations) {
    return (
      <Card>
        <Unavailable what="Generations" />
      </Card>
    );
  }

  const sum = (pick: (day: GenerationsDay) => number): number =>
    generations.reduce((total, day) => total + pick(day), 0);

  const total = sum((day) => day.total);
  const succeeded = sum((day) => day.succeeded);
  const failed = sum((day) => day.failed);
  const pending = sum((day) => day.pending);

  return (
    <Card>
      <MetricRow>
        <Metric label={`Started, last ${windowDays} days`} value={formatCount(total)} />
        <Metric label="Succeeded" value={formatCount(succeeded)} />
        <Metric
          label="Failed"
          value={formatCount(failed)}
          tone={failed > 0 ? "warning" : "neutral"}
        />
        <Metric label="Still running" value={formatCount(pending)} hint="Not yet an outcome" />
      </MetricRow>

      <DaySeries
        label={`Generations started per day, last ${windowDays} days`}
        points={generations.map((day) => ({ day: day.day, value: day.total }))}
        format={formatCount}
      />
    </Card>
  );
}
