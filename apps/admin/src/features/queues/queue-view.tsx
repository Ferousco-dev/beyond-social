import { type ReactNode } from "react";

import { readQueueSnapshot } from "@/lib/queues/read";

import { FailedJobsPanel } from "./components/failed-jobs-panel";
import { QueueDepthPanel } from "./components/queue-depth-panel";
import { QueueUnavailable } from "./components/queue-unavailable";

/**
 * The publishing queue inspector.
 *
 * One read, one decision: either Redis answered and every panel below is a
 * real reading, or it did not and the page says so and shows nothing else.
 * There is no partial state here on purpose, because the panels share a single
 * reading and half of one would be a page that is right about some numbers.
 */
export async function QueueView(): Promise<ReactNode> {
  const snapshot = await readQueueSnapshot();

  if (!snapshot.ok) return <QueueUnavailable reason={snapshot.reason} />;

  return (
    <div className="flex flex-col gap-8">
      <QueueDepthPanel snapshot={snapshot.value} />
      <FailedJobsPanel snapshot={snapshot.value} />
    </div>
  );
}
