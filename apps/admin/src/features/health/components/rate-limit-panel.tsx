import { Metric, MetricRow } from "@/components/ui/metric";
import { Table, Td, Th } from "@/components/ui/table";
import { formatCount } from "@/lib/format";
import { formatAge } from "@/lib/health/format";
import type { RateLimitPressure } from "@/lib/health/types";

import { Panel, PanelEmpty } from "./panel";

export function RateLimitPanel({ data }: { data: RateLimitPressure | null }) {
  return (
    <Panel
      title="Rate limit pressure"
      hint="Windows still open, grouped by key scope. Identifiers stay in the database."
      observedAt={data?.observedAt ?? null}
    >
      {data ? (
        <>
          <MetricRow>
            <Metric label="Active keys" value={formatCount(data.activeKeys)} />
          </MetricRow>

          {data.scopes.length === 0 ? (
            <PanelEmpty>No open rate limit windows.</PanelEmpty>
          ) : (
            <Table caption="Rate limit scopes by total attempts in the open window">
              <thead>
                <tr>
                  <Th>Scope</Th>
                  <Th numeric>Keys</Th>
                  <Th numeric>Attempts</Th>
                  <Th numeric>Busiest key</Th>
                  <Th numeric>Window ends in</Th>
                </tr>
              </thead>
              <tbody>
                {data.scopes.map((entry) => (
                  <tr key={entry.scope}>
                    <Td>{entry.scope}</Td>
                    <Td numeric>{formatCount(entry.keys)}</Td>
                    <Td numeric>{formatCount(entry.totalCount)}</Td>
                    <Td numeric>{formatCount(entry.peakCount)}</Td>
                    <Td numeric>{formatAge(data.observedAt, entry.windowEndsAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      ) : null}
    </Panel>
  );
}
