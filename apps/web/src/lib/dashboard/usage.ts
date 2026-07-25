import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { isPromptEngineConfigured } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";

/** Windows the usage page offers. */
export const USAGE_WINDOWS = [
  { id: "24h", label: "24 hours", hours: 24 },
  { id: "7d", label: "7 days", hours: 24 * 7 },
  { id: "30d", label: "30 days", hours: 24 * 30 },
] as const;

export type UsageWindowId = (typeof USAGE_WINDOWS)[number]["id"];

const summaryRowSchema = z.object({
  calls: z.coerce.number(),
  cached_calls: z.coerce.number(),
  failed_calls: z.coerce.number(),
  input_tokens: z.coerce.number(),
  output_tokens: z.coerce.number(),
  cost_usd: z.coerce.number(),
  p50_latency_ms: z.coerce.number(),
});

export interface UsageSummary {
  calls: number;
  cachedCalls: number;
  failedCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  p50LatencyMs: number;
  /** False when the engine has never run, so the page can say so honestly. */
  hasData: boolean;
}

const EMPTY: UsageSummary = {
  calls: 0,
  cachedCalls: 0,
  failedCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  p50LatencyMs: 0,
  hasData: false,
};

/**
 * Rolled-up AI usage for the signed-in user. Returns zeros rather than throwing
 * when nothing is configured yet, so the page renders an honest empty state
 * instead of an error.
 */
export async function getUsageSummary(window: UsageWindowId): Promise<UsageSummary> {
  if (!isSupabaseConfigured) return EMPTY;

  const hours = USAGE_WINDOWS.find((option) => option.id === window)?.hours ?? 24;
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data, error } = await supabase.rpc("ai_usage_summary", {
    p_user: user.id,
    p_since: since,
  } as never);
  if (error) return EMPTY;

  const rows = Array.isArray(data) ? data : [data];
  const parsed = summaryRowSchema.safeParse(rows[0]);
  if (!parsed.success) return EMPTY;

  return {
    calls: parsed.data.calls,
    cachedCalls: parsed.data.cached_calls,
    failedCalls: parsed.data.failed_calls,
    inputTokens: parsed.data.input_tokens,
    outputTokens: parsed.data.output_tokens,
    costUsd: parsed.data.cost_usd,
    p50LatencyMs: parsed.data.p50_latency_ms,
    hasData: parsed.data.calls > 0,
  };
}

/** True when the engine is wired but has simply not run yet. */
export function isEngineReady(): boolean {
  return isPromptEngineConfigured;
}
