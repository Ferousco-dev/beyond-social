import { Metric, MetricRow } from "@/components/ui/metric";
import { Table, Td, Th } from "@/components/ui/table";
import { formatCount } from "@/lib/format";
import { HEALTH_THRESHOLDS } from "@/lib/health/config";
import { formatAge, formatRate, rate } from "@/lib/health/format";
import type { AiFailures } from "@/lib/health/types";

import { Panel, PanelEmpty } from "./panel";

export function AiFailuresPanel({ data }: { data: AiFailures | null }) {
  const errorRate = data ? rate(data.failures, data.calls) : null;

  return (
    <Panel
      title="AI reliability"
      hint={`Recorded calls by provider and model, last ${HEALTH_THRESHOLDS.windowHours}h`}
      observedAt={data?.observedAt ?? null}
    >
      {data ? (
        <>
          <MetricRow>
            <Metric label="Calls" value={formatCount(data.calls)} />
            <Metric
              label="Failures"
              value={formatCount(data.failures)}
              tone={data.failures > 0 ? "warning" : "neutral"}
            />
            <Metric
              label="Error rate"
              value={formatRate(errorRate)}
              tone={errorRate !== null && errorRate >= 5 ? "critical" : "neutral"}
            />
          </MetricRow>

          {data.providers.length === 0 ? (
            <PanelEmpty>
              {data.calls === 0
                ? "No AI calls recorded in the window."
                : "Every recorded call succeeded."}
            </PanelEmpty>
          ) : (
            <Table caption="Providers and models with failures, worst first">
              <thead>
                <tr>
                  <Th>Provider</Th>
                  <Th>Model</Th>
                  <Th numeric>Calls</Th>
                  <Th numeric>Failures</Th>
                  <Th>Last error</Th>
                  <Th numeric>Ago</Th>
                </tr>
              </thead>
              <tbody>
                {data.providers.map((entry) => (
                  <tr key={`${entry.provider}-${entry.model}`}>
                    <Td>{entry.provider}</Td>
                    <Td muted>{entry.model}</Td>
                    <Td numeric>{formatCount(entry.calls)}</Td>
                    <Td numeric>{formatCount(entry.failures)}</Td>
                    <Td muted>
                      <span className="font-mono text-xs">
                        {entry.lastError === "" ? "no message recorded" : entry.lastError}
                      </span>
                    </Td>
                    <Td numeric>
                      {entry.lastFailedAt ? formatAge(entry.lastFailedAt, data.observedAt) : "-"}
                    </Td>
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
