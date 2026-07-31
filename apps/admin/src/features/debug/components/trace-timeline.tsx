import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";

import { SOURCE_LABEL, formatMoment, statusTone } from "../status";
import type { TraceTimeline } from "../types";

import { ErrorText, Panel, PanelEmpty, RecordId } from "./panel";

/**
 * Every record carrying one trace id, oldest first.
 *
 * A render and the post that used it happen in different processes, days apart,
 * and the trace id is the only thing joining them. Reading them in one ordered
 * list is what turns "their video never went out" into a specific row.
 */
export function TraceTimelinePanel({
  data,
  traceId,
}: {
  data: TraceTimeline | null;
  traceId: string;
}): ReactNode {
  return (
    <Panel
      title="Trace"
      hint={`Every generation and post carrying ${traceId}, oldest first`}
      observedAt={data?.observedAt ?? null}
    >
      {data ? (
        data.records === 0 ? (
          <PanelEmpty>
            No record carries that trace id. It may belong to a request that failed before anything
            was written, or to a different environment.
          </PanelEmpty>
        ) : (
          <Table caption={`Records carrying trace ${traceId}`}>
            <thead>
              <tr>
                <Th>Started</Th>
                <Th>Kind</Th>
                <Th>Status</Th>
                <Th>Detail</Th>
                <Th>Record</Th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={`${event.kind}-${event.id}`}>
                  <Td muted>
                    <span className="tabular-nums whitespace-nowrap">
                      {formatMoment(event.createdAt)}
                    </span>
                  </Td>
                  <Td>{SOURCE_LABEL[event.kind]}</Td>
                  <Td>
                    <Badge tone={statusTone(event.status)}>{event.status}</Badge>
                  </Td>
                  <Td muted>
                    <div>{event.detail}</div>
                    {event.error ? (
                      <div className="mt-1">
                        <ErrorText>{event.error}</ErrorText>
                      </div>
                    ) : null}
                  </Td>
                  <Td>
                    <RecordId value={event.id} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      ) : null}
    </Panel>
  );
}
