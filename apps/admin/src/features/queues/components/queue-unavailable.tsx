import { CloudOff, Unplug } from "lucide-react";
import { type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { type QueueUnavailable as Reason } from "@/lib/queues/types";

/**
 * What the page shows instead of the queue.
 *
 * Nothing else renders alongside this, and in particular no counts. A zero and
 * an unknown look identical on screen and mean opposite things: one says the
 * queue is clear, the other says nobody can tell whether it is. Rendering a
 * panel of zeroes next to a warning would let a reader take the reassuring
 * reading and ignore the caveat.
 */
export function QueueUnavailable({ reason }: { reason: Reason["reason"] }): ReactNode {
  if (reason === "not-configured") {
    return (
      <EmptyState
        icon={Unplug}
        title="No queue is configured"
        description="This environment has no REDIS_URL, so there is no publishing queue to inspect. No counts are shown, because zero would be a claim this page cannot make."
      />
    );
  }

  return (
    <EmptyState
      icon={CloudOff}
      title="The queue is not reachable"
      description="Redis is configured but did not answer in time, so the publishing queue could not be read. No counts are shown: this is not a report of zero, and the queue may be perfectly healthy or completely stalled."
    />
  );
}
