import "server-only";

import { type UsageRecord, type UsageSink } from "@beyond-social/ai-gateway";

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Persists gateway usage to Postgres. Writes are fire-and-forget: usage
 * accounting must never fail a generation the user is waiting on, so a failed
 * insert is logged and dropped rather than thrown.
 */
export class SupabaseUsageSink implements UsageSink {
  record(usage: UsageRecord): void {
    void this.write(usage);
  }

  private async write(usage: UsageRecord): Promise<void> {
    try {
      const client = createServiceClient();
      const { error } = await client.rpc("ai_usage_record", {
        p_usage: usage,
      } as never);
      if (error) throw new Error(error.message);
    } catch (error) {
      logger.warn("failed to record ai usage", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
