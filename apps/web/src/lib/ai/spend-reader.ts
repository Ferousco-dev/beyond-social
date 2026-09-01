import "server-only";

import { type SpendReader } from "@beyond-social/ai-gateway";

import { createServiceClient } from "@/lib/supabase/service";

/** Matches the shape of a Postgres uuid, which the spend function requires. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What a user has spent on model calls, read from `ai_usage`.
 *
 * The gateway keys spend by user id, and falls back to the literal
 * `"anonymous"` for work that belongs to nobody: cron, trend discovery, the
 * platform's own background jobs. That is not a uuid and has no row to sum, so
 * it reports zero rather than sending Postgres something it will reject.
 *
 * Platform work being unbudgeted is deliberate, not an oversight. It is our own
 * load, running on a schedule we control, and a ceiling that stopped it would
 * be stopping the product rather than protecting it. The rate limiter still
 * bounds it.
 */
export class SupabaseSpendReader implements SpendReader {
  async spentUsd(key: string, since: number): Promise<number> {
    if (!UUID.test(key)) return 0;

    const client = createServiceClient();
    const { data, error } = await client.rpc("ai_spend_usd", {
      p_user: key,
      p_since: new Date(since).toISOString(),
    } as never);
    if (error) throw new Error(error.message);

    // The function returns numeric, which the client hands back as a string
    // when the value does not fit a float exactly.
    const spent = typeof data === "string" ? Number.parseFloat(data) : Number(data ?? 0);
    return Number.isFinite(spent) ? spent : 0;
  }
}
