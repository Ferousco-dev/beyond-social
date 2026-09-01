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
  /**
   * Who the spend belongs to when it is not the individual. A budget is set on
   * an organisation, not on each of its members in turn, so cost that cannot be
   * grouped by org cannot be governed by one.
   */
  orgId: z.string().nullable(),
  /**
   * Ties this call to the unit of work that caused it.
   *
   * One chat message fans out into four or five model calls, and a generation
   * continues into a worker that publishes later. Without a shared id, the only
   * questions answerable are per call ("what did this cost") rather than the
   * ones actually asked ("what did this message cost", "which request scheduled
   * the publish that failed").
   */
  traceId: z.string().nullable(),
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
