import { type ReactNode } from "react";

import { Card, Unavailable } from "@/components/ui/card";
import { Metric, MetricRow } from "@/components/ui/metric";
import { Table, Td, Th } from "@/components/ui/table";
import { type AiSpendByModel, type AiSpendDay } from "@/lib/analytics";
import { formatCount, formatUsd } from "@/lib/format";

import { DaySeries } from "./day-series";

/**
 * What the platform spent on AI over the window.
 *
 * Cost is summed from what each call actually recorded, so a cached call adds
 * volume and nothing to the bill. Nothing here is a projection or a forecast.
 */
export function SpendPanel({
  spend,
  byModel,
  windowDays,
}: {
  spend: readonly AiSpendDay[] | null;
  byModel: readonly AiSpendByModel[] | null;
  windowDays: number;
}): ReactNode {
  if (!spend) {
    return (
      <Card>
        <Unavailable what="AI spend" />
      </Card>
    );
  }

  const sum = (pick: (day: AiSpendDay) => number): number =>
    spend.reduce((total, day) => total + pick(day), 0);

  const cost = sum((day) => day.cost_usd);
  const calls = sum((day) => day.calls);
  const cached = sum((day) => day.cached_calls);
  const failed = sum((day) => day.failed_calls);

  return (
    <Card>
      <MetricRow>
        <Metric label={`Spend, last ${windowDays} days`} value={formatUsd(cost)} />
        <Metric label="Calls" value={formatCount(calls)} />
        <Metric label="Served from cache" value={formatCount(cached)} hint="Counted, but free" />
        <Metric
          label="Failed calls"
          value={formatCount(failed)}
          tone={failed > 0 ? "warning" : "neutral"}
        />
      </MetricRow>

      <DaySeries
        label={`AI spend per day, last ${windowDays} days`}
        points={spend.map((day) => ({ day: day.day, value: day.cost_usd }))}
        format={formatUsd}
      />

      {byModel === null ? null : byModel.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No AI calls recorded in the window.</p>
      ) : (
        <div className="mt-4">
          <Table caption="AI spend by provider and model, most expensive first">
            <thead>
              <tr>
                <Th>Provider</Th>
                <Th>Model</Th>
                <Th numeric>Calls</Th>
                <Th numeric>Failed</Th>
                <Th numeric>Input tokens</Th>
                <Th numeric>Output tokens</Th>
                <Th numeric>Cost</Th>
              </tr>
            </thead>
            <tbody>
              {byModel.map((entry) => (
                <tr key={`${entry.provider}-${entry.model}`}>
                  <Td>{entry.provider}</Td>
                  <Td muted>{entry.model}</Td>
                  <Td numeric>{formatCount(entry.calls)}</Td>
                  <Td numeric>{formatCount(entry.failed_calls)}</Td>
                  <Td numeric>{formatCount(entry.input_tokens)}</Td>
                  <Td numeric>{formatCount(entry.output_tokens)}</Td>
                  <Td numeric>{formatUsd(entry.cost_usd)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
