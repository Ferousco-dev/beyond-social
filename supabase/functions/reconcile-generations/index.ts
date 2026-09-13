// Backstop for generations that never settle.
//
// `kie-callback` and the client poll (`use-generation-poll.ts`) are the two
// paths a generation normally finishes through. Both can miss: the webhook
// can be lost to a network partition or a rotated `KIE_CALLBACK_SECRET`, and
// the client poll gives up after eight minutes without failing the row, it
// only stops asking. Either way the generation is left at "generating" with
// its credit already held by `reserve_generation_credits`, and nothing was
// watching that row again after that. This does.
//
// Triggered on a schedule by `/api/cron/reconcile-generations` (Vercel Cron
// is the only scheduler this project has; nothing here calls pg_cron). That
// route holds the shared secret and its own `CRON_SECRET` gate; this function
// is the second lock, checked independently in case it is ever reachable by
// its URL directly.
//
// APPLIES BY DEFAULT. The cron sends a bare GET, which this route turned
// into a permanent dry run: the sweep ran daily and changed nothing, and a
// lost webhook plus a slow render left a paid generation stuck forever. A run
// that settles rows reports what it did; `?dry_run=1` previews instead.
//
// Asks the provider before giving up on a row. A stuck row is one whose
// completion signal went missing, not one whose render failed: force-failing
// without checking would refund a credit for a video that actually exists and
// can still be recovered. `recordInfo` is a plain read, so each stuck row gets
// one status call. Success is persisted and completed exactly as the callback
// would have done; a known failure is failed through the normal refund path;
// still generating means the row stays put and this sweep leaves it for the
// next one, up to the hard cap past which the render is treated as lost.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/http.ts";
import { getJobInfo, getRecordInfo, type KieRecordInfo } from "../_shared/kie.ts";
import { timingSafeEqual } from "../_shared/security.ts";
import { persistRender } from "../_shared/store.ts";
import { deliverEvent } from "../_shared/webhooks.ts";
import { log } from "../_shared/trace.ts";

/**
 * How long a row sits at "generating" before this treats it as stuck.
 *
 * The client poll already calls a render slow at eight minutes
 * (`POLL_TIMEOUT_MS` in `use-generation-poll.ts`), so this has to clear that
 * by a wide margin or it would race ordinary completions instead of backstopping
 * them. Four times that gives real renders room to finish through a browser tab
 * that is merely slow to poll, while still resolving a truly stuck row well
 * inside a day rather than leaving a held credit stranded indefinitely.
 */
const STUCK_THRESHOLD_MINUTES = 30;

/** Caps one sweep's work so a large backlog cannot turn a cron tick into a slow, unbounded scan. */
const BATCH_LIMIT = 200;

/**
 * How long a render may run at the provider before it is treated as lost.
 *
 * kie.ai's own guidance for market tasks is to stop polling after 10 to 15
 * minutes; past this by hours, no result is coming and the held credit is
 * stranded. Only reached after the status check, so a genuinely slow task
 * that still reports `generating` inside a day is left alone rather than
 * refunded for something the provider is still about to deliver.
 */
const HARD_CAP_MINUTES = 24 * 60;

const FAIL_REASON =
  "This generation did not receive a result from the render provider in time. Your credit has been refunded.";

interface StuckGeneration {
  id: string;
  user_id: string;
  provider_task_id: string | null;
  model: string | null;
  created_at: string;
  trace_id: string | null;
}

/** What one row's reconciliation came to, so the summary can say where each went. */
interface SweepCounts {
  failed: number;
  recovered: number;
  leftWaiting: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const provided = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  if (!expected || !timingSafeEqual(provided, expected)) {
    return json({ error: "Forbidden" }, 403);
  }

  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60_000).toISOString();
  const { data, error: queryError } = await admin
    .from("video_generations")
    .select(
      "id, user_id, provider_task_id, model, created_at, trace_id",
    )
    .eq("status", "generating")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (queryError) {
    log("error", "reconcile-generations query failed", { reason: queryError.message });
    return json({ error: "Could not query stuck generations" }, 500);
  }

  const stuck = (data ?? []) as StuckGeneration[];

  if (dryRun) {
    log("info", "reconcile-generations dry run", { candidates: stuck.length });
    return json({
      applied: false,
      dryRun: true,
      thresholdMinutes: STUCK_THRESHOLD_MINUTES,
      candidates: stuck.length,
      failed: 0,
      recovered: 0,
      leftWaiting: 0,
    });
  }

  const counts: SweepCounts = { failed: 0, recovered: 0, leftWaiting: 0 };
  for (const row of stuck) {
    await reconcileRow(admin, row, counts);
  }

  log("info", "reconcile-generations sweep complete", { ...counts, candidates: stuck.length });
  return json({
    applied: true,
    thresholdMinutes: STUCK_THRESHOLD_MINUTES,
    hardCapMinutes: HARD_CAP_MINUTES,
    candidates: stuck.length,
    ...counts,
  });
});

/**
 * Asks the provider about one stuck row and settles it by what comes back.
 *
 * A row without a task id never reached the provider, so there is nothing to
 * ask and the hard cap does not apply to it: it has been stuck since dispatch,
 * which the 30-minute threshold already covers.
 */
async function reconcileRow(
  admin: SupabaseClient,
  row: StuckGeneration,
  counts: SweepCounts,
): Promise<void> {
  if (row.provider_task_id === null) {
    await failRow(admin, row, FAIL_REASON, "no task id", counts);
    return;
  }

  const info = await statusOf(row);
  if (info === null) {
    // An unreadable answer is not evidence of failure. Leaving the row alone
    // and reporting it beats refunding a render that may have finished.
    counts.leftWaiting += 1;
    log("warn", "reconcile-generations: provider status unreadable, leaving the row", {
      traceId: row.trace_id,
      generationId: row.id,
      taskId: row.provider_task_id,
    });
    return;
  }

  if (info.successFlag === 1 && info.resultUrls.length > 0) {
    await recoverRow(admin, row, info.resultUrls[0], counts);
    return;
  }
  if (info.successFlag === 2 || info.successFlag === 3) {
    await failRow(
      admin,
      row,
      "The render provider reported this generation as failed. Your credit has been refunded.",
      "provider reported failure",
      counts,
    );
    return;
  }

  // Still generating at the provider. Kept unless it is past the hard cap,
  // past which the result is treated as never coming.
  const ageMinutes = (Date.now() - Date.parse(row.created_at)) / 60_000;
  if (ageMinutes < HARD_CAP_MINUTES) {
    counts.leftWaiting += 1;
    return;
  }
  await failRow(admin, row, FAIL_REASON, "past the hard cap", counts);
}

/** Reads the provider's status, through the endpoint the task's model names. */
async function statusOf(row: StuckGeneration): Promise<KieRecordInfo | null> {
  const taskId = row.provider_task_id;
  if (taskId === null) return null;
  try {
    const isVeo = typeof row.model === "string" && row.model.startsWith("veo");
    return isVeo ? await getRecordInfo(taskId) : await getJobInfo(taskId);
  } catch (error) {
    log("warn", "reconcile-generations: provider status call failed", {
      traceId: row.trace_id,
      generationId: row.id,
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Completes a row the provider says actually finished, exactly as the missing
 * callback would have.
 *
 * The result is copied into durable storage first, so what the row points at
 * outlives the provider's own link expiry. Delivered as `generation.completed`,
 * because the user-facing fact is that their video is ready, not that the
 * webhook was lost.
 */
async function recoverRow(
  admin: SupabaseClient,
  row: StuckGeneration,
  sourceUrl: string,
  counts: SweepCounts,
): Promise<void> {
  const taskId = row.provider_task_id as string;
  const resultUrl = await persistRender(admin, row.user_id, taskId, sourceUrl);
  const { error } = await admin.rpc("complete_generation", {
    p_provider_task_id: taskId,
    p_result_url: resultUrl,
  });
  if (error) {
    log("error", "reconcile-generations: complete_generation failed", {
      traceId: row.trace_id,
      generationId: row.id,
      reason: error.message,
    });
    counts.leftWaiting += 1;
    return;
  }

  counts.recovered += 1;
  log("info", "generation recovered through reconciliation", {
    traceId: row.trace_id,
    generationId: row.id,
    taskId,
  });
  await deliverEvent(
    admin,
    row.user_id,
    "generation.completed",
    { generation_id: row.id, result_url: resultUrl },
    row.trace_id,
  );
}

/** Fails a stuck row and refunds it, the same path a real failure takes. */
async function failRow(
  admin: SupabaseClient,
  row: StuckGeneration,
  reason: string,
  why: string,
  counts: SweepCounts,
): Promise<void> {
  const { error } = await admin.rpc("fail_generation_by_id", {
    p_generation: row.id,
    p_error: reason,
  });
  if (error) {
    log("error", "reconcile-generations: fail_generation_by_id failed", {
      traceId: row.trace_id,
      generationId: row.id,
      reason: error.message,
    });
    return;
  }

  counts.failed += 1;
  log("warn", "generation reconciled as failed", {
    traceId: row.trace_id,
    generationId: row.id,
    why,
  });
  await deliverEvent(
    admin,
    row.user_id,
    "generation.failed",
    { generation_id: row.id, error: reason },
    row.trace_id,
  );
}
