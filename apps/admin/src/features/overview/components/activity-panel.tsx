import { type ReactNode } from "react";

import { Card, Unavailable } from "@/components/ui/card";
import { Metric, MetricRow } from "@/components/ui/metric";
import { type ActiveUsersDay, type SignupsDay } from "@/lib/analytics";
import { formatCount } from "@/lib/format";

import { DaySeries } from "./day-series";

/**
 * Signups and actives over the window.
 *
 * The caveat under the figures is not decoration. There is no session or
 * page-view table in this schema, so "active" can only mean a user who did
 * something the product records. Reading these as visits would overstate
 * engagement, and the number cannot carry that qualification on its own.
 */
export function ActivityPanel({
  signups,
  actives,
  windowDays,
}: {
  signups: readonly SignupsDay[] | null;
  actives: readonly ActiveUsersDay[] | null;
  windowDays: number;
}): ReactNode {
  if (!signups || !actives) {
    return (
      <Card>
        <Unavailable what="Activity" />
      </Card>
    );
  }

  const signupsInWindow = signups.reduce((total, day) => total + day.signups, 0);
  const latest = actives[actives.length - 1];

  return (
    <Card>
      <MetricRow>
        <Metric label={`Signups, last ${windowDays} days`} value={formatCount(signupsInWindow)} />
        <Metric
          label="Active today"
          value={latest ? formatCount(latest.dau) : "no data"}
          hint="Distinct users who acted today, UTC"
        />
        <Metric
          label="Active in 30 days"
          value={latest ? formatCount(latest.mau) : "no data"}
          hint="Trailing 30 days ending today"
        />
      </MetricRow>

      <DaySeries
        label={`Signups per day, last ${windowDays} days`}
        points={signups.map((day) => ({ day: day.day, value: day.signups }))}
        format={formatCount}
      />

      <p className="mt-4 text-xs text-ink-soft">
        Active means a user who sent or received a message, or started a video generation, on that
        day. The product records no sessions or page views, so someone who signed in and only
        browsed is not counted here.
      </p>
    </Card>
  );
}
