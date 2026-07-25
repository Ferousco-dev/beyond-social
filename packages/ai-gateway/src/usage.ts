import { z } from "zod";

/**
 * What every call emits, whether it succeeded or not. This one record feeds
 * observability (latency, error rate), billing (cost), and cost optimisation
 * (which task is spending the money), so it is worth recording even on failure.
 */
export const usageRecordSchema = z.object({
  requestId: z.string(),
  task: z.string(),
  /** The model that actually served the request, after any fallback. */
  model: z.string(),
  provider: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  latencyMs: z.number().nonnegative(),
  /** How many models were tried before this one succeeded. */
  fallbacks: z.number().int().nonnegative(),
  attempts: z.number().int().positive(),
  cached: z.boolean(),
  ok: z.boolean(),
  error: z.string().nullable(),
  userId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type UsageRecord = z.infer<typeof usageRecordSchema>;

/** Where usage goes. Swap for a database or metrics sink in production. */
export interface UsageSink {
  record(usage: UsageRecord): void | Promise<void>;
}

/** Keeps the last N records in memory, for tests and local inspection. */
export class MemoryUsageSink implements UsageSink {
  private readonly entries: UsageRecord[] = [];

  constructor(private readonly limit = 500) {}

  record(usage: UsageRecord): void {
    this.entries.push(usage);
    if (this.entries.length > this.limit) this.entries.shift();
  }

  all(): readonly UsageRecord[] {
    return this.entries;
  }

  totalCostUsd(): number {
    return this.entries.reduce((total, entry) => total + entry.costUsd, 0);
  }
}

/** Discards usage. Used when a deployment has no sink configured. */
export class NoopUsageSink implements UsageSink {
  record(): void {}
}
