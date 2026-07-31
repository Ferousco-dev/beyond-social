import "server-only";

import { type Job } from "bullmq";

import { QUEUE_LIMITS, QUEUE_STATES } from "./config";
import { withPublishQueue, type PublishQueue } from "./connection";
import { epochMillisSchema, jobCountsSchema, publishJobDataSchema } from "./schemas";
import { type FailedJob, type OldestWaiting, type QueueResult, type QueueSnapshot } from "./types";

/**
 * BullMQ v5 keeps a marker entry in the wait list to wake idle workers. It is
 * not a job and has no hash behind it, so it has to be skipped when reading the
 * tail, or the oldest waiting age reads as unknown while jobs are piling up.
 */
const WAIT_MARKER = "0";

/** How far up the tail of the wait list to look past markers. */
const WAIT_TAIL_WINDOW = 10;

/** One reading of the publishing queue, or the reason there is no reading. */
export async function readQueueSnapshot(): Promise<QueueResult<QueueSnapshot>> {
  return withPublishQueue(async (queue) => {
    const [rawCounts, paused, failed, oldestWaiting] = await Promise.all([
      queue.getJobCounts(...QUEUE_STATES),
      queue.isPaused(),
      queue.getFailed(0, QUEUE_LIMITS.failedListLimit - 1),
      readOldestWaiting(queue),
    ]);

    return {
      observedAt: new Date(),
      counts: jobCountsSchema.parse(rawCounts),
      paused,
      oldestWaiting,
      failed: failed.map(toFailedJob),
    };
  });
}

/**
 * The age of the oldest job nobody has picked up yet.
 *
 * This is the number that says something is wrong. A waiting count of 400 is
 * fine if the oldest of them arrived four seconds ago, and a waiting count of
 * one is an incident if it has been sitting there since last night.
 *
 * The wait list is LPUSHed by BullMQ and consumed from the tail, so the oldest
 * job is the last element, not the first.
 */
async function readOldestWaiting(queue: PublishQueue): Promise<OldestWaiting | null> {
  const client = await queue.client;
  const tail = await client.lrange(queue.toKey("wait"), -WAIT_TAIL_WINDOW, -1);

  // lrange returns the window in list order, so the oldest job is its last
  // element. Walking forward would report the newest waiting job instead, which
  // reads as a healthy queue at exactly the moment a backlog is building.
  for (let index = tail.length - 1; index >= 0; index -= 1) {
    const jobId = tail[index];
    if (jobId === undefined || jobId === WAIT_MARKER) continue;

    const timestamp = await client.hget(queue.toKey(jobId), "timestamp");
    const parsed = epochMillisSchema.safeParse(timestamp);
    // A job that vanished between the two reads was picked up, which is the
    // opposite of stuck. The next oldest is the honest answer.
    if (parsed.success) return { jobId, enqueuedAt: new Date(parsed.data) };
  }

  return null;
}

function toFailedJob(job: Job): FailedJob {
  const data = publishJobDataSchema.safeParse(job.data);
  const finishedOn = epochMillisSchema.safeParse(job.finishedOn);

  return {
    id: job.id ?? "unknown",
    attemptsMade: job.attemptsMade,
    maxAttempts: typeof job.opts.attempts === "number" ? job.opts.attempts : null,
    error: truncate(job.failedReason ?? "", QUEUE_LIMITS.errorChars),
    failedAt: finishedOn.success ? new Date(finishedOn.data) : null,
    scheduledPostId: data.success ? data.data.scheduledPostId : null,
    platform: data.success ? data.data.platform : null,
  };
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}
