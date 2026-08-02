/**
 * What the debugging console works with once the database's answers have been
 * parsed. Every payload carries `observedAt` from the database clock, for the
 * same reason the health console does: a view with no timestamp is a way to
 * look at yesterday and believe it is now.
 */
export interface Observed {
  observedAt: Date;
}

export type TraceKind = "generation" | "publish";
export type FailureSource = TraceKind | "ai";

export interface TraceEvent {
  kind: TraceKind;
  id: string;
  userId: string | null;
  status: string;
  /** Provider and model for a generation, platform for a post. */
  detail: string;
  /** The provider's own words, in full. Null when the record never failed. */
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TraceTimeline extends Observed {
  records: number;
  events: TraceEvent[];
}

export interface FailureDetail {
  kind: FailureSource;
  id: string;
  userId: string | null;
  detail: string;
  /** Untruncated. The exact wording is the reason this page exists. */
  error: string;
  /** Trace id for a generation or post, request id for an AI call. */
  correlation: string | null;
  failedAt: Date;
}

export interface FailureDetails extends Observed {
  matched: number;
  items: FailureDetail[];
}

export interface StuckItem {
  kind: TraceKind;
  id: string;
  userId: string | null;
  status: string;
  detail: string;
  correlation: string | null;
  /** When the item entered the state it never left. */
  since: Date;
  /** An external id exists, so the platform accepted the video. */
  alreadyPosted: boolean;
  /** Safe to put back in front of the scheduler. False for every generation. */
  retryable: boolean;
}

export interface StuckWork extends Observed {
  generatingStuck: number;
  publishIncomplete: number;
  items: StuckItem[];
}

export type RetryResult =
  { status: "ok"; mayHavePosted: boolean } | { status: "error"; message: string };
