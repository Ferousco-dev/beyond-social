import { type QueueState } from "./config";

/**
 * The result of anything that has to talk to Redis.
 *
 * The two failure reasons are kept apart all the way to the screen. "No Redis
 * is configured" is a deployment fact, "Redis did not answer" is an incident,
 * and neither one is a count of zero. Collapsing them into a nullable value
 * would let the page render an outage as an idle queue.
 */
export type QueueUnavailable =
  | { readonly ok: false; readonly reason: "not-configured" }
  | { readonly ok: false; readonly reason: "unreachable" };

export type QueueResult<TValue> = { readonly ok: true; readonly value: TValue } | QueueUnavailable;

export type QueueCounts = Readonly<Record<QueueState, number>>;

/** The head of the waiting list, which is the oldest job still unclaimed. */
export interface OldestWaiting {
  readonly jobId: string;
  readonly enqueuedAt: Date;
}

export interface FailedJob {
  readonly id: string;
  readonly attemptsMade: number;
  readonly maxAttempts: number | null;
  /** The worker's last error, truncated. Empty when BullMQ recorded none. */
  readonly error: string;
  readonly failedAt: Date | null;
  /** Null when the payload did not match the worker's contract. */
  readonly scheduledPostId: string | null;
  readonly platform: string | null;
}

export interface QueueSnapshot {
  /** The console clock, not the database clock: this reading came from Redis. */
  readonly observedAt: Date;
  readonly counts: QueueCounts;
  readonly paused: boolean;
  readonly oldestWaiting: OldestWaiting | null;
  readonly failed: readonly FailedJob[];
}
