import { NextResponse } from "next/server";

import { isCronAuthorised } from "@/lib/cron/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { serverEnv } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Retention.
 *
 * Embeddings older than a year are dropped, and AI usage detail older than
 * ninety days is rolled into daily totals. Messages and generations are never
 * touched: they are the record of work someone paid for.
 *
 * DRY RUN BY DEFAULT. This endpoint reports what it would remove and removes
 * nothing unless `?apply=1` is passed. That asymmetry is deliberate: the first
 * accidental call, the misconfigured schedule, the copied curl command, should
 * all be harmless. Deleting has to be the thing you asked for.
 */
export const dynamic = "force-dynamic";

interface RetentionResult {
  affected: number;
  oldest: string | null;
  dry_run: boolean;
}

export const GET = withTrace("GET /api/cron/retention", async (request) => {
  if (!isCronAuthorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured || serverEnv.SUPABASE_SERVICE_ROLE_KEY === "") {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  const apply = new URL(request.url).searchParams.get("apply") === "1";
  const supabase = createServiceClient();

  const run = async (fn: "retention_prune_embeddings" | "retention_rollup_ai_usage") => {
    const { data, error } = await supabase.rpc(fn, { p_dry_run: !apply });
    if (error) throw new Error(`${fn}: ${error.message}`);
    const row = (data as RetentionResult[] | null)?.[0];
    return { affected: Number(row?.affected ?? 0), oldest: row?.oldest ?? null };
  };

  try {
    // Sequential, not parallel. Both are write-heavy against the same database,
    // and nothing here is urgent enough to make them compete.
    const embeddings = await run("retention_prune_embeddings");
    const usage = await run("retention_rollup_ai_usage");

    logger.info(apply ? "retention applied" : "retention dry run", {
      embeddingsAffected: embeddings.affected,
      usageAffected: usage.affected,
    });

    return NextResponse.json({ ok: true, applied: apply, embeddings, usage });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("retention failed", { error: message });
    return NextResponse.json({ error: "retention_failed" }, { status: 500 });
  }
});
