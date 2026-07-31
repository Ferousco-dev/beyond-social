import { Search } from "lucide-react";
import { type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";

import { DebugFilters } from "./components/debug-filters";
import { FailureListPanel } from "./components/failure-list";
import { StuckListPanel } from "./components/stuck-list";
import { TraceTimelinePanel } from "./components/trace-timeline";
import { getFailureDetails, getStuckWork, getTraceTimeline } from "./queries";
import { type DebugQuery } from "./query";

/**
 * The debugging console.
 *
 * The reads run in parallel and each panel prints its own observation time, so
 * a slow or failing query degrades that panel alone rather than quietly ageing
 * the whole page behind one timestamp.
 */
export async function DebugView({ query }: { query: DebugQuery }): Promise<ReactNode> {
  const [trace, failures, stuck] = await Promise.all([
    query.trace ? getTraceTimeline(query.trace) : Promise.resolve(null),
    getFailureDetails(query.day, query.kind),
    getStuckWork(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <DebugFilters query={query} />

      {query.trace ? (
        <TraceTimelinePanel data={trace} traceId={query.trace} />
      ) : (
        // Not a Panel: a panel with no observation time means the read failed,
        // and nothing has been asked here yet.
        <EmptyState
          icon={Search}
          title="No trace id yet"
          description="Paste the trace id from a support report to see the generation and the post it produced, in the order they happened."
        />
      )}

      <FailureListPanel data={failures} query={query} />
      <StuckListPanel data={stuck} />
    </div>
  );
}
