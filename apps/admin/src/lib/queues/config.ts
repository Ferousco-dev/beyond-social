/**
 * Constants for the publishing queue inspector.
 *
 * The queue name is duplicated from apps/worker/src/queues/publishing.ts rather
 * than imported: the console does not depend on the worker package, and a
 * string that must match is easier to audit here than a build edge that makes
 * the console unbuildable when the worker changes.
 */
export const PUBLISH_QUEUE = "publish-post";

export const QUEUE_LIMITS = {
  /**
   * The whole Redis interaction, connect included, must finish inside this.
   * A console page that hangs waiting on a dead Redis is worse than a console
   * page that says Redis is dead, so the budget is short and absolute.
   */
  deadlineMs: 2_500,
  connectTimeoutMs: 1_500,
  commandTimeoutMs: 1_500,
  /** Failed jobs listed per page. The count above the list is always exact. */
  failedListLimit: 25,
  /** Provider errors are long, and nothing here needs more than the shape. */
  errorChars: 400,
} as const;

/**
 * When a job that nobody has picked up stops being normal.
 *
 * A publish is seconds of work, so these match the publishing thresholds the
 * health console already uses. They colour the oldest-waiting figure and
 * nothing else: the inspector never hides a job for being young.
 */
export const WAIT_AGE_THRESHOLDS = {
  warnMs: 5 * 60_000,
  criticalMs: 20 * 60_000,
} as const;

/** The states the inspector reports, in the order an operator reads them. */
export const QUEUE_STATES = ["waiting", "active", "delayed", "failed", "completed"] as const;

export type QueueState = (typeof QUEUE_STATES)[number];
