import { type ReactNode } from "react";

import { Card, Unavailable } from "@/components/ui/card";
import { Metric, MetricRow } from "@/components/ui/metric";
import { Table, Td, Th } from "@/components/ui/table";
import { type PlanSubscriptions, type UserTotals } from "@/lib/analytics";
import { formatCount } from "@/lib/format";

/**
 * Where the platform stands right now. Both figures are counts of rows that
 * exist at query time, not a running total maintained anywhere, so they cannot
 * drift from the tables they describe.
 */
export function TotalsPanel({
  totals,
  plans,
}: {
  totals: UserTotals | null;
  plans: readonly PlanSubscriptions[] | null;
}): ReactNode {
  return (
    <Card>
      {totals ? (
        <MetricRow>
          <Metric label="Accounts" value={formatCount(totals.total_users)} hint="Profiles, one per signup" />
          <Metric
            label="Live subscriptions"
            value={formatCount(totals.active_subscriptions)}
            hint="Active or trialing, the statuses that grant credits"
          />
        </MetricRow>
      ) : (
        <Unavailable what="Platform totals" />
      )}

      {plans === null ? null : plans.length === 0 ? (
        <p className="text-sm text-ink-soft">No live subscription on any plan.</p>
      ) : (
        <Table caption="Live subscriptions by plan">
          <thead>
            <tr>
              <Th>Plan</Th>
              <Th numeric>Subscriptions</Th>
              <Th numeric>Of which trialing</Th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.plan}>
                <Td>{plan.plan}</Td>
                <Td numeric>{formatCount(plan.subscriptions)}</Td>
                <Td numeric>{formatCount(plan.trialing)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
