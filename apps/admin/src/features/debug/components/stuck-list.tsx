import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Metric, MetricRow } from "@/components/ui/metric";
import { Table, Td, Th } from "@/components/ui/table";
import { formatCount } from "@/lib/format";
import { formatAge } from "@/lib/health/format";

import { DEBUG_THRESHOLDS } from "../config";
import { SOURCE_LABEL, statusTone } from "../status";
import type { StuckItem, StuckWork } from "../types";

import { Panel, PanelEmpty, RecordId } from "./panel";
import { RetryButton } from "./retry-button";

/**
 * Work that entered a transient state and never left it.
 *
 * The publish half is wider than the health console's: any post that set
 * publish_started_at and never reached 'published' appears here, including the
 * one a dying worker marked failed after it had already called the platform.
 */
export function StuckListPanel({ data }: { data: StuckWork | null }): ReactNode {
  return (
    <Panel
      title="Stuck work"
      hint={`Generating past ${DEBUG_THRESHOLDS.generatingStaleMinutes}m, and publishes started past ${DEBUG_THRESHOLDS.publishingStaleMinutes}m ago that never finished`}
      observedAt={data?.observedAt ?? null}
    >
      {data ? (
        <>
          <MetricRow>
            <Metric
              label="Generating, no callback"
              value={formatCount(data.generatingStuck)}
              hint="The kie.ai callback never arrived"
              tone={data.generatingStuck > 0 ? "warning" : "neutral"}
            />
            <Metric
              label="Publishes never finished"
              value={formatCount(data.publishIncomplete)}
              hint="A worker claimed the row and stopped"
              tone={data.publishIncomplete > 0 ? "critical" : "neutral"}
            />
          </MetricRow>

          {data.items.length === 0 ? (
            <PanelEmpty>Nothing stuck at the time above.</PanelEmpty>
          ) : (
            <Table caption="Work stuck in a transient state, oldest first">
              <thead>
                <tr>
                  <Th>Kind</Th>
                  <Th>Status</Th>
                  <Th>Detail</Th>
                  <Th numeric>Stuck for</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={`${item.kind}-${item.id}`}>
                    <Td>{SOURCE_LABEL[item.kind]}</Td>
                    <Td>
                      <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                    </Td>
                    <Td muted>
                      <div>{item.detail}</div>
                      <div className="mt-1">
                        <RecordId value={item.id} />
                      </div>
                    </Td>
                    <Td numeric>{formatAge(item.since, data.observedAt)}</Td>
                    <Td>
                      <StuckAction item={item} />
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

/**
 * What can honestly be offered for one stuck row.
 *
 * A generation is not resubmittable from here: kie.ai renders are started by an
 * edge function on a user request, and nothing in the platform consumes a
 * generation row put back into 'queued'. A button that set the status and
 * changed nothing else would look like a fix and be a lie, so the row says what
 * it actually needs instead.
 */
function StuckAction({ item }: { item: StuckItem }): ReactNode {
  if (item.kind === "generation") {
    return <span className="text-xs text-ink-soft">Resubmit from the app</span>;
  }

  if (item.alreadyPosted) {
    return <span className="text-xs text-ink-soft">Already on the platform</span>;
  }

  if (!item.retryable) {
    return <span className="text-xs text-ink-soft">Not retryable</span>;
  }

  return <RetryButton postId={item.id} platform={item.detail} />;
}
