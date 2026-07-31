import { z } from "zod";

/**
 * One row per calendar day per model: the finest grain the page reads. The
 * chart, the model breakdown and the CSV export are all folds of these rows,
 * so none of them can quote a number the others do not agree with.
 */
export const generationRowSchema = z.object({
  day: z.string(),
  model: z.string(),
  runs: z.coerce.number().int(),
  succeeded: z.coerce.number().int(),
  failed: z.coerce.number().int(),
  credits_spent: z.coerce.number().int(),
  credits_refunded: z.coerce.number().int(),
});

export interface UsageRow {
  readonly day: string;
  readonly model: string;
  readonly runs: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly creditsSpent: number;
  readonly creditsRefunded: number;
}

export function toUsageRow(row: z.infer<typeof generationRowSchema>): UsageRow {
  return {
    day: row.day,
    model: row.model,
    runs: row.runs,
    succeeded: row.succeeded,
    failed: row.failed,
    creditsSpent: row.credits_spent,
    creditsRefunded: row.credits_refunded,
  };
}

/** A bar in the chart. Present for every day in range, including empty ones. */
export interface UsageDay {
  readonly day: string;
  readonly runs: number;
  /** Credits kept: charged minus refunded, which is what the balance moved by. */
  readonly netCredits: number;
}

export interface UsageModel {
  readonly model: string;
  readonly name: string;
  readonly runs: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly creditsSpent: number;
  readonly creditsRefunded: number;
}

/** `ai_usage`, which records provider calls. It carries no credit price, so it reports none. */
export const modelCallSchema = z.object({
  task: z.string(),
  model: z.string(),
  provider: z.string(),
  calls: z.coerce.number().int(),
  cached: z.coerce.number().int(),
  failed: z.coerce.number().int(),
  input_tokens: z.coerce.number().int(),
  output_tokens: z.coerce.number().int(),
  p50_latency_ms: z.coerce.number().int(),
});

export interface ModelCall {
  readonly task: string;
  readonly model: string;
  readonly provider: string;
  readonly calls: number;
  readonly cached: number;
  readonly failed: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly p50LatencyMs: number;
}

export function toModelCall(row: z.infer<typeof modelCallSchema>): ModelCall {
  return {
    task: row.task,
    model: row.model,
    provider: row.provider,
    calls: row.calls,
    cached: row.cached,
    failed: row.failed,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    p50LatencyMs: row.p50_latency_ms,
  };
}

export interface UsageReport {
  readonly rows: readonly UsageRow[];
  readonly days: readonly UsageDay[];
  readonly models: readonly UsageModel[];
  readonly calls: readonly ModelCall[];
  readonly totalCreditsSpent: number;
  readonly totalCreditsRefunded: number;
  readonly totalRuns: number;
  readonly balance: number;
  readonly timeZone: string;
  /** False when nothing ran in the range, so the page says so instead of plotting zeroes. */
  readonly hasData: boolean;
}
