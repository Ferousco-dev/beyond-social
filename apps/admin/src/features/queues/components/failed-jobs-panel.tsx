import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { Table, Td, Th } from "@/components/ui/table";
import { formatAge } from "@/lib/health/format";
import { QUEUE_LIMITS } from "@/lib/queues/config";
import { type QueueSnapshot } from "@/lib/queues/types";

import { JobActions } from "./job-actions";

/**
 * Failed jobs with the error the worker recorded and how many attempts it took
 * to give up. Oldest failure first, which is BullMQ's own order and also the
 * one worth acting on: the job that has been broken longest.
 */
export function FailedJobsPanel({ snapshot }: { snapshot: QueueSnapshot }): ReactNode {
  const { failed, counts, observedAt } = snapshot;

  return (
    <Section
      title="Failed jobs"
      description="Retry puts a job back on the queue. Remove drops it, and the post it was for is never published. Both are recorded in the audit log."
    >
      {failed.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">
            No failed jobs were on the queue at the time above.
          </p>
        </Card>
      ) : (
        <Card>
          <Table caption="Failed publishing jobs, oldest failure first">
            <thead>
              <tr>
                <Th>Job</Th>
                <Th>Platform</Th>
                <Th numeric>Attempts</Th>
                <Th numeric>Failed</Th>
                <Th>Error</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {failed.map((job) => (
                <tr key={job.id}>
                  <Td>
                    <span className="font-mono text-xs">{job.id}</span>
                    {job.scheduledPostId ? (
                      <span className="block font-mono text-xs text-ink-soft">
                        post {job.scheduledPostId.slice(0, 8)}
                      </span>
                    ) : null}
                  </Td>
                  <Td muted>{job.platform ?? "unreadable payload"}</Td>
                  <Td numeric>
                    {job.attemptsMade}
                    {job.maxAttempts === null ? "" : ` of ${job.maxAttempts}`}
                  </Td>
                  <Td numeric>
                    {job.failedAt ? `${formatAge(job.failedAt, observedAt)} ago` : "unknown"}
                  </Td>
                  <Td muted>
                    <span className="block max-w-md break-words">
                      {job.error === "" ? "no error recorded" : job.error}
                    </span>
                  </Td>
                  <Td>
                    <JobActions jobId={job.id} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>

          {counts.failed > failed.length ? (
            <p className="mt-3 text-xs text-ink-soft">
              Showing the {QUEUE_LIMITS.failedListLimit} oldest of {counts.failed}. The count above
              is exact.
            </p>
          ) : null}
        </Card>
      )}
    </Section>
  );
}
