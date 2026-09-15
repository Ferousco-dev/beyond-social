import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface AiSpendPoint {
  day: string;
  costUsd: number;
  calls: number;
  failedCalls: number;
  cachedCalls: number;
}

/** AI spend per day over the window. */
export async function getAiSpendDaily(days = 30): Promise<AiSpendPoint[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ai_spend_daily", { p_days: days });
  if (error || !data) return [];

  const schema = z.object({
    day: z.string(),
    cost_usd: z.coerce.number(),
    calls: z.coerce.number(),
    failed_calls: z.coerce.number(),
    cached_calls: z.coerce.number(),
  });
  return data.flatMap((row) => {
    const parsed = schema.safeParse(row);
    if (!parsed.success) return [];
    return [
      {
        day: parsed.data.day,
        costUsd: parsed.data.cost_usd,
        calls: parsed.data.calls,
        failedCalls: parsed.data.failed_calls,
        cachedCalls: parsed.data.cached_calls,
      },
    ];
  });
}

export interface AiSpendByModel {
  provider: string;
  model: string;
  calls: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  failedCalls: number;
}

/** AI spend by model over the window, most expensive first. */
export async function getAiSpendByModel(days = 30): Promise<AiSpendByModel[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ai_spend_by_model", { p_days: days });
  if (error || !data) return [];

  const schema = z.object({
    provider: z.string(),
    model: z.string(),
    calls: z.coerce.number(),
    cost_usd: z.coerce.number(),
    input_tokens: z.coerce.number(),
    output_tokens: z.coerce.number(),
    failed_calls: z.coerce.number(),
  });
  return data.flatMap((row) => {
    const parsed = schema.safeParse(row);
    if (!parsed.success) return [];
    return [
      {
        provider: parsed.data.provider,
        model: parsed.data.model,
        calls: parsed.data.calls,
        costUsd: parsed.data.cost_usd,
        inputTokens: parsed.data.input_tokens,
        outputTokens: parsed.data.output_tokens,
        failedCalls: parsed.data.failed_calls,
      },
    ];
  });
}
