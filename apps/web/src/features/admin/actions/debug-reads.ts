"use server";

import {
  getFailureDetails,
  getTraceTimeline,
  type FailureDetails,
  type FailureKind,
  type TraceTimeline,
} from "@/lib/dashboard/admin";

/** Read-only wrapper so the client-side trace lookup can reach the admin-gated RPC. */
export async function lookupTrace(traceId: string): Promise<TraceTimeline | null> {
  return getTraceTimeline(traceId);
}

/** Read-only wrapper so the client-side failure explorer can reach the admin-gated RPC. */
export async function exploreFailures(
  sinceHours: number,
  kind: FailureKind,
): Promise<FailureDetails | null> {
  return getFailureDetails(sinceHours, kind);
}
