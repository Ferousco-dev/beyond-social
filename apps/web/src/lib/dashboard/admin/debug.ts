import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const traceEventSchema = z.object({
  kind: z.string(),
  id: z.string(),
  user_id: z.string().nullable(),
  status: z.string(),
  detail: z.string(),
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface TraceEvent {
  kind: string;
  id: string;
  userId: string | null;
  status: string;
  detail: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TraceTimeline {
  observedAt: string;
  records: number;
  items: TraceEvent[];
}

/** Every record carrying one trace id, oldest first. Null when unavailable. */
export async function getTraceTimeline(traceId: string): Promise<TraceTimeline | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_trace_timeline", { p_trace_id: traceId });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({
      observed_at: z.string(),
      records: z.coerce.number(),
      items: z.array(traceEventSchema),
    })
    .safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    records: parsed.data.records,
    items: parsed.data.items.map((i) => ({
      kind: i.kind,
      id: i.id,
      userId: i.user_id,
      status: i.status,
      detail: i.detail,
      error: i.error,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    })),
  };
}

export type FailureKind = "all" | "generation" | "publish" | "ai";

const failureDetailSchema = z.object({
  kind: z.string(),
  id: z.string(),
  user_id: z.string().nullable(),
  detail: z.string(),
  error: z.string(),
  correlation: z.string().nullable(),
  failed_at: z.string(),
});

export interface FailureDetail {
  kind: string;
  id: string;
  userId: string | null;
  detail: string;
  error: string;
  correlation: string | null;
  failedAt: string;
}

export interface FailureDetails {
  observedAt: string;
  matched: number;
  items: FailureDetail[];
}

/** Failures in a window with the provider's untruncated error text. */
export async function getFailureDetails(
  sinceHours: number,
  kind: FailureKind = "all",
  limit = 50,
): Promise<FailureDetails | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const now = new Date();
  const { data, error } = await supabase.rpc("admin_failure_details", {
    p_since: new Date(now.getTime() - sinceHours * 3600_000).toISOString(),
    p_until: now.toISOString(),
    p_kind: kind,
    p_limit: limit,
  });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({
      observed_at: z.string(),
      matched: z.coerce.number(),
      items: z.array(failureDetailSchema),
    })
    .safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    matched: parsed.data.matched,
    items: parsed.data.items.map((i) => ({
      kind: i.kind,
      id: i.id,
      userId: i.user_id,
      detail: i.detail,
      error: i.error,
      correlation: i.correlation,
      failedAt: i.failed_at,
    })),
  };
}
