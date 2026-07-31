import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { QueueView } from "@/features/queues/queue-view";

export const metadata: Metadata = { title: "Queue" };

/**
 * Never cached. A queue reading served from a cache is a way to look at last
 * hour's backlog and believe it is now, which is the one thing this page must
 * not do.
 */
export const dynamic = "force-dynamic";

export default function QueuesPage(): ReactNode {
  return (
    <>
      <PageHeader
        title="Publishing queue"
        description="What the publish-post queue is holding right now, read straight from Redis. If Redis cannot be reached the page says so rather than reporting zero."
      />
      <QueueView />
    </>
  );
}
