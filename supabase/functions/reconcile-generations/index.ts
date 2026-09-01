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
// Deliberately does not call kie.ai to check whether a stuck task actually
// finished. `getJobInfo`/`getRecordInfo` are read-only endpoints, but kie.ai's
// docs never state whether a status check is billed separately from task
// creation, and the credit-consumption field they document is scoped to the
// original render. Guessing free and being wrong would spend real money on
// every sweep, which the marathon rules for this session rule out entirely.
// So a stuck row is simply failed, which refunds its held credit through the
// same `fail_generation_by_id` path a real failure takes: the user sees an
// error instead of a spinner that never resolves, which is the actual bug
// this closes, without a live provider call anywhere in the loop.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { json, serve } from "../_shared/http.ts";
import { timingSafeEqual } from "../_shared/security.ts";
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

const FAIL_REASON =
  "This generation did not receive a result from the render provider in time. Your credit has been refunded.";

interface StuckGeneration {
  id: string;
  user_id: string;
  trace_id: string | null;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const provided = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  if (!expected || !timingSafeEqual(provided, expected)) {
    return json({ error: "Forbidden" }, 403);
  }

  const { apply } = (await req.json().catch(() => ({}))) as { apply?: boolean };

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60_000).toISOString();
  const { data, error: queryError } = await admin
    .from("video_generations")
    .select("id, user_id, trace_id")
    .eq("status", "generating")
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (queryError) {
    log("error", "reconcile-generations query failed", { reason: queryError.message });
    return json({ error: "Could not query stuck generations" }, 500);
  }

  const stuck = (data ?? []) as StuckGeneration[];

  if (!apply) {
    log("info", "reconcile-generations dry run", { candidates: stuck.length });
    return json({
      applied: false,
      thresholdMinutes: STUCK_THRESHOLD_MINUTES,
      candidates: stuck.length,
      failed: 0,
    });
  }

  let failed = 0;
  for (const row of stuck) {
    const { error } = await admin.rpc("fail_generation_by_id", {
      p_generation: row.id,
      p_error: FAIL_REASON,
    });
    if (error) {
      log("error", "reconcile-generations: fail_generation_by_id failed", {
        traceId: row.trace_id,
        generationId: row.id,
        reason: error.message,
      });
      continue;
    }

    failed += 1;
    log("warn", "generation reconciled as failed (stuck past threshold)", {
      traceId: row.trace_id,
      generationId: row.id,
      thresholdMinutes: STUCK_THRESHOLD_MINUTES,
    });
    await deliverEvent(
      admin,
      row.user_id,
      "generation.failed",
      { generation_id: row.id, error: FAIL_REASON },
      row.trace_id,
    );
  }

  return json({
    applied: true,
    thresholdMinutes: STUCK_THRESHOLD_MINUTES,
    candidates: stuck.length,
    failed,
  });
});
