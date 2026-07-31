import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Metric, MetricRow, type MetricTone } from "@/components/ui/metric";
import { Section } from "@/components/ui/section";
import { formatCount } from "@/lib/format";
import { formatAge } from "@/lib/health/format";
import { WAIT_AGE_THRESHOLDS } from "@/lib/queues/config";
import { type QueueSnapshot } from "@/lib/queues/types";

/**
 * Queue depth, with the oldest waiting job given the prominence it deserves.
 *
 * The five counts are the obvious numbers and the least useful ones: a waiting
 * count of four hundred is fine if they all arrived this second. The age of the
 * oldest unclaimed job is what distinguishes a busy queue from a stopped one,
 * so it is the figure that carries colour.
 */
export function QueueDepthPanel({ snapshot }: { snapshot: QueueSnapshot }): ReactNode {
  const { counts, oldestWaiting, observedAt } = snapshot;
  const waitMs = oldestWaiting ? observedAt.getTime() - oldestWaiting.enqueuedAt.getTime() : 0;

  return (
    <Section
      title="Queue depth"
      description="Live from Redis. Counts are exact at the time shown below."
    >
      <Card>
        <MetricRow>
          <Metric
            label="Oldest waiting"
            value={oldestWaiting ? formatAge(oldestWaiting.enqueuedAt, observedAt) : "nothing waiting"}
            hint={oldestWaiting ? `Job ${oldestWaiting.jobId}, still unclaimed` : undefined}
            tone={waitTone(waitMs)}
          />
        </MetricRow>

        <MetricRow>
          <Metric label="Waiting" value={formatCount(counts.waiting)} />
          <Metric label="Active" value={formatCount(counts.active)} />
          <Metric label="Delayed" value={formatCount(counts.delayed)} />
          <Metric
            label="Failed"
            value={formatCount(counts.failed)}
            tone={counts.failed > 0 ? "critical" : "neutral"}
          />
          <Metric
            label="Completed"
            value={formatCount(counts.completed)}
            hint="Retained tail, not a lifetime total"
          />
        </MetricRow>

        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
          {snapshot.paused ? <Badge tone="warning">Queue paused</Badge> : null}
          <p className="tabular-nums">
            read from Redis at{" "}
            <time dateTime={observedAt.toISOString()}>
              {observedAt.toISOString().slice(11, 19)} UTC
            </time>
          </p>
        </div>
      </Card>
    </Section>
  );
}

function waitTone(ageMs: number): MetricTone {
  if (ageMs >= WAIT_AGE_THRESHOLDS.criticalMs) return "critical";
  if (ageMs >= WAIT_AGE_THRESHOLDS.warnMs) return "warning";
  return "neutral";
}
