import "server-only";

import { DEBUG_THRESHOLDS, dayBounds, minutesInterval } from "./config";
import { type FailureKind } from "./query";
import { readDebugRpc } from "./rpc";
import { failureDetailsSchema, stuckWorkSchema, traceTimelineSchema } from "./schemas";
import type { FailureDetails, StuckWork, TraceTimeline } from "./types";

/** Every record carrying one trace id, oldest first, across both tables. */
export async function getTraceTimeline(traceId: string): Promise<TraceTimeline | null> {
  const row = await readDebugRpc("admin_trace_timeline", { p_trace_id: traceId });

  const parsed = traceTimelineSchema.safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    records: parsed.data.records,
    events: parsed.data.items.map((item) => ({
      kind: item.kind,
      id: item.id,
      userId: item.user_id,
      status: item.status,
      detail: item.detail,
      error: item.error,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  };
}

/** Failures on one UTC day with the provider's own error text, untruncated. */
export async function getFailureDetails(day: string, kind: FailureKind): Promise<FailureDetails | null> {
  const { since, until } = dayBounds(day);
  const row = await readDebugRpc("admin_failure_details", {
    p_since: since,
    p_until: until,
    p_kind: kind,
    p_limit: DEBUG_THRESHOLDS.listLimit,
  });

  const parsed = failureDetailsSchema.safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    matched: parsed.data.matched,
    items: parsed.data.items.map((item) => ({
      kind: item.kind,
      id: item.id,
      userId: item.user_id,
      detail: item.detail,
      error: item.error,
      correlation: item.correlation,
      failedAt: item.failed_at,
    })),
  };
}

/** Work that entered a transient state and never left it. */
export async function getStuckWork(): Promise<StuckWork | null> {
  const row = await readDebugRpc("admin_stuck_work", {
    p_generating_stale: minutesInterval(DEBUG_THRESHOLDS.generatingStaleMinutes),
    p_publishing_stale: minutesInterval(DEBUG_THRESHOLDS.publishingStaleMinutes),
    p_limit: DEBUG_THRESHOLDS.listLimit,
  });

  const parsed = stuckWorkSchema.safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    generatingStuck: parsed.data.generating_stuck,
    publishIncomplete: parsed.data.publish_incomplete,
    items: parsed.data.items.map((item) => ({
      kind: item.kind,
      id: item.id,
      userId: item.user_id,
      status: item.status,
      detail: item.detail,
      correlation: item.correlation,
      since: item.since,
      alreadyPosted: item.already_posted,
      retryable: item.retryable,
    })),
  };
}
