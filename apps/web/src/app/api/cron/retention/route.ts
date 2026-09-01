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
 * Embeddings older than a year are dropped, AI usage detail older than ninety
 * days is rolled into daily totals, and long-retired or never-recalled memories
 * are removed. Messages and generations are never
 * touched: they are the record of work someone paid for.
 *
 * DRY RUN BY DEFAULT. This endpoint reports what it would remove and removes
 * nothing unless it is told to apply. That asymmetry is deliberate: the first
 * accidental call, the misconfigured schedule, the copied curl command, should
 * all be harmless. Deleting has to be the thing you asked for.
 *
 * Which is why the scheduled run has never deleted anything. `vercel.json`
 * schedules this path with no query string, so every nightly run since it
 * shipped has been a dry run: the logs say "retention dry run", the counts grow,
 * and nothing is ever removed. A default that cannot be reached by the only
 * caller is not a safe default, it is an off switch nobody knows about.
 *
 * So applying is now a setting rather than a URL. `RETENTION_APPLY=1` turns the
 * scheduled run into a real one, which means it can be enabled after reading a
 * dry run and turned off again without a deploy. `?apply=1` still works for a
 * one-off manual run.
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

  const apply =
    new URL(request.url).searchParams.get("apply") === "1" || serverEnv.RETENTION_APPLY === "1";
  const supabase = createServiceClient();

  const run = async (
    fn: "retention_prune_embeddings" | "retention_rollup_ai_usage" | "retention_prune_memories",
  ) => {
    const { data, error } = await supabase.rpc(fn, { p_dry_run: !apply });
    if (error) throw new Error(`${fn}: ${error.message}`);
    const row = (data as RetentionResult[] | null)?.[0];
    return { affected: Number(row?.affected ?? 0), oldest: row?.oldest ?? null };
  };

  // Mail returns two counts rather than one, because clearing a payload and
  // deleting a record are different acts with different consequences.
  const runMail = async (): Promise<{ payloadsCleared: number; rowsDeleted: number }> => {
    const { data, error } = await supabase.rpc("retention_prune_mail", { p_dry_run: !apply });
    if (error) throw new Error(`retention_prune_mail: ${error.message}`);
    const row = (data as { payloads_cleared: number; rows_deleted: number }[] | null)?.[0];
    return {
      payloadsCleared: Number(row?.payloads_cleared ?? 0),
      rowsDeleted: Number(row?.rows_deleted ?? 0),
    };
  };

  try {
    // Sequential, not parallel. Both are write-heavy against the same database,
    // and nothing here is urgent enough to make them compete.
    const embeddings = await run("retention_prune_embeddings");
    const usage = await run("retention_rollup_ai_usage");
    const mail = await runMail();
    // Retired claims and ones nobody ever recalled. Memories a person still
    // uses are never touched by age: a preference stated in January is not less
    // true in August.
    const memories = await run("retention_prune_memories");

    // A dry run says so, and says what would make it real. Otherwise a line
    // reading "retention dry run" every morning looks like a working job.
    logger.info(apply ? "retention applied" : "retention dry run, nothing deleted", {
      ...(apply ? {} : { enableWith: "RETENTION_APPLY=1" }),
      embeddingsAffected: embeddings.affected,
      usageAffected: usage.affected,
      mailPayloadsCleared: mail.payloadsCleared,
      mailRowsDeleted: mail.rowsDeleted,
      memoriesAffected: memories.affected,
    });

    return NextResponse.json({ ok: true, applied: apply, embeddings, usage, mail, memories });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("retention failed", { error: message });
    return NextResponse.json({ error: "retention_failed" }, { status: 500 });
  }
});
