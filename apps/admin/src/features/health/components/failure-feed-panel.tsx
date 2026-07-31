import { Metric, MetricRow } from "@/components/ui/metric";
import { Table, Td, Th } from "@/components/ui/table";
import { formatCount } from "@/lib/format";
import { HEALTH_THRESHOLDS } from "@/lib/health/config";
import { formatAge } from "@/lib/health/format";
import type { FailureFeed } from "@/lib/health/types";

import { Panel, PanelEmpty } from "./panel";

const KIND_LABEL: Record<FailureFeed["items"][number]["kind"], string> = {
  generation: "Generation",
  publish: "Publish",
};

export function FailureFeedPanel({ data }: { data: FailureFeed | null }) {
  return (
    <Panel
      title="Failures"
      hint={`Generations and posts that ended in failed, last ${HEALTH_THRESHOLDS.windowHours}h`}
      observedAt={data?.observedAt ?? null}
    >
      {data ? (
        <>
          <MetricRow>
            <Metric
              label="Failed generations"
              value={formatCount(data.failedGenerations)}
              tone={data.failedGenerations > 0 ? "warning" : "neutral"}
            />
            <Metric
              label="Failed posts"
              value={formatCount(data.failedPosts)}
              tone={data.failedPosts > 0 ? "critical" : "neutral"}
            />
          </MetricRow>

          {data.items.length === 0 ? (
            <PanelEmpty>No failures in the window.</PanelEmpty>
          ) : (
            <Table caption="Recent failures, newest first">
              <thead>
                <tr>
                  <Th>Kind</Th>
                  <Th>Detail</Th>
                  <Th>Error</Th>
                  <Th numeric>Ago</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={`${item.kind}-${item.id}`}>
                    <Td>{KIND_LABEL[item.kind]}</Td>
                    <Td muted>{item.detail}</Td>
                    <Td muted>
                      <span className="font-mono text-xs">
                        {item.error === "" ? "no message recorded" : item.error}
                      </span>
                    </Td>
                    <Td numeric>{formatAge(item.failedAt, data.observedAt)}</Td>
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
