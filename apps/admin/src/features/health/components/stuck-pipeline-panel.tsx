import { Metric, MetricRow } from "@/components/ui/metric";
import { Table, Td, Th } from "@/components/ui/table";
import { formatCount } from "@/lib/format";
import { HEALTH_THRESHOLDS } from "@/lib/health/config";
import { formatAge } from "@/lib/health/format";
import type { StuckPipeline } from "@/lib/health/types";

import { Panel, PanelEmpty } from "./panel";

const KIND_LABEL: Record<StuckPipeline["items"][number]["kind"], string> = {
  generation: "Generation",
  publish: "Publish",
};

export function StuckPipelinePanel({ data }: { data: StuckPipeline | null }) {
  const stuck = data ? data.generatingStuck + data.publishingStuck : 0;

  return (
    <Panel
      title="Stuck work"
      hint={`Generating past ${HEALTH_THRESHOLDS.generatingStaleMinutes}m, publishing past ${HEALTH_THRESHOLDS.publishingStaleMinutes}m`}
      observedAt={data?.observedAt ?? null}
    >
      {data ? (
        <>
          <MetricRow>
            <Metric
              label="Generating, no callback"
              value={formatCount(data.generatingStuck)}
              tone={data.generatingStuck > 0 ? "warning" : "neutral"}
            />
            <Metric
              label="Publishing, worker may have died"
              value={formatCount(data.publishingStuck)}
              tone={data.publishingStuck > 0 ? "critical" : "neutral"}
            />
          </MetricRow>

          {stuck === 0 ? (
            <PanelEmpty>Nothing stuck at the time above.</PanelEmpty>
          ) : (
            <Table caption="Items stuck in a transient state, oldest first">
              <thead>
                <tr>
                  <Th>Kind</Th>
                  <Th>Detail</Th>
                  <Th numeric>Stuck for</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={`${item.kind}-${item.id}`}>
                    <Td>{KIND_LABEL[item.kind]}</Td>
                    <Td muted>{item.detail}</Td>
                    <Td numeric>{formatAge(item.since, data.observedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {stuck > data.items.length ? (
            <p className="mt-3 text-xs text-ink-soft">
              Showing the {data.items.length} oldest. The counts above are exact.
            </p>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}
