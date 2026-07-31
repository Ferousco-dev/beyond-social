import { type ReactNode } from "react";

import { Table, Td, Th } from "@/components/ui/table";
import { formatCount } from "@/lib/format";

import { DEBUG_THRESHOLDS } from "../config";
import { FAILURE_KIND_LABEL, type DebugQuery } from "../query";
import { SOURCE_LABEL, formatMoment } from "../status";
import type { FailureDetails } from "../types";

import { ErrorText, Panel, PanelEmpty, RecordId } from "./panel";

/**
 * Failures on one day, with the provider's error exactly as it was recorded.
 *
 * The health console truncates these to two hundred characters, which is right
 * for a dashboard and wrong here: the part of a provider message that says what
 * to do is usually past that cut.
 */
export function FailureListPanel({
  data,
  query,
}: {
  data: FailureDetails | null;
  query: DebugQuery;
}): ReactNode {
  return (
    <Panel
      title="Failures"
      hint={`${FAILURE_KIND_LABEL[query.kind]} that failed on ${query.day}, newest first, with the provider's own message`}
      observedAt={data?.observedAt ?? null}
    >
      {data ? (
        data.matched === 0 ? (
          <PanelEmpty>Nothing failed in that window.</PanelEmpty>
        ) : (
          <>
            <Table caption={`Failures on ${query.day}`}>
              <thead>
                <tr>
                  <Th>Failed</Th>
                  <Th>Kind</Th>
                  <Th>Detail</Th>
                  <Th>Error</Th>
                  <Th>Correlation</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={`${item.kind}-${item.id}`}>
                    <Td muted>
                      <span className="tabular-nums whitespace-nowrap">
                        {formatMoment(item.failedAt)}
                      </span>
                    </Td>
                    <Td>{SOURCE_LABEL[item.kind]}</Td>
                    <Td muted>
                      <div>{item.detail}</div>
                      <div className="mt-1">
                        <RecordId value={item.id} />
                      </div>
                    </Td>
                    <Td>
                      <ErrorText>{item.error}</ErrorText>
                    </Td>
                    <Td>
                      {item.correlation ? (
                        <RecordId value={item.correlation} />
                      ) : (
                        <span className="text-ink-soft">none recorded</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {data.matched > data.items.length ? (
              <p className="mt-3 text-xs text-ink-soft">
                Showing the {DEBUG_THRESHOLDS.listLimit} newest of {formatCount(data.matched)}. The
                count is exact, the list is not.
              </p>
            ) : null}
            <p className="mt-3 text-xs text-ink-soft">
              AI calls carry a request id rather than a trace id, so they cannot be joined to a
              generation or a post by the trace above.
            </p>
          </>
        )
      ) : null}
    </Panel>
  );
}
