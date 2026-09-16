// Scheduled endpoint: asks HeyGen how pending voice clones are getting on,
// and moves the rows that have finished.
//
// Same shape as poll-heygen-training: a bounded batch of pending rows, oldest
// first, safe to run again if a run dies partway, with a stuck-safety cutoff
// so a row that never resolves does not sit at 'pending' forever with nothing
// ever saying why.
import { adminClient } from "../_shared/credits.ts";
import { isCronRequestAuthorised } from "../_shared/cron-auth.ts";
import { json, serve } from "../_shared/http.ts";
import { getVoiceClone, isHeygenConfigured } from "../_shared/heygen.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/** Bounded so one run cannot spend an unbounded amount of the provider's quota. */
const BATCH = 20;

/** Same reasoning as poll-heygen-training's MAX_POLLS: a row cannot poll forever. */
const MAX_POLLS = 60;

// Confirmed against developers.heygen.com/reference/get-voice (read 2026-09-15):
// status is exactly "processing" | "complete" | "failed".
const READY_STATUSES = new Set(["complete"]);
const FAILED_STATUSES = new Set(["failed"]);

interface PendingRow {
  id: string;
  voice_clone_id: string;
  poll_count: number;
  generation_id: string | null;
}

/**
 * Closes the video_generations row clone-voice charged a credit against.
 *
 * Not `complete_generation`: that RPC matches by `provider_task_id` and
 * writes a `result_url`, both video-shaped, and a cloned voice is neither. The
 * credit was already reserved at dispatch (the same reserve-before-dispatch
 * pattern every other generation type uses), so "ready" here is only ever a
 * status transition, never a second charge.
 *
 * `fail_generation_by_id` is already generic (matches by id, refunds whatever
 * the ledger actually shows debited), so the failure side reuses it exactly.
 */
async function settleGeneration(
  admin: ReturnType<typeof adminClient>,
  generationId: string | null,
  outcome: { ready: true } | { ready: false; error: string },
): Promise<void> {
  if (!generationId) return;
  if (outcome.ready) {
    const { error } = await admin
      .from("video_generations")
      .update({ status: "ready", error: null })
      .eq("id", generationId)
      .neq("status", "ready");
    if (error) throw new Error(`Failed to settle generation ${generationId}: ${error.message}`);
    return;
  }
  const { error } = await admin.rpc("fail_generation_by_id", {
    p_generation: generationId,
    p_error: outcome.error,
  });
  if (error) throw new Error(`Failed to refund generation ${generationId}: ${error.message}`);
}

serve(async (request) => {
  const traceId = traceIdFrom(request);
  if (!isCronRequestAuthorised(request)) return json({ error: "unauthorized" }, 401);

  if (!isHeygenConfigured()) {
    log("info", "voice clone polling skipped, provider unconfigured", { traceId });
    return json({ checked: 0, reason: "provider_unconfigured" });
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from("voice_profiles")
    .select("id, voice_clone_id, poll_count, generation_id")
    .eq("clone_status", "pending")
    .not("voice_clone_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(BATCH);
  if (error) {
    log("error", "could not list pending voice clones", { traceId, error: error.message });
    return json({ error: "query_failed" }, 500);
  }

  const rows = (data ?? []) as PendingRow[];
  let ready = 0;
  let failed = 0;

  for (const row of rows) {
    const now = new Date().toISOString();
    const nextPollCount = (row.poll_count ?? 0) + 1;
    try {
      const clone = await getVoiceClone(row.voice_clone_id);

      if (clone.status && READY_STATUSES.has(clone.status) && clone.voiceId) {
        const { error: updateError } = await admin
          .from("voice_profiles")
          .update({
            clone_status: "ready",
            provider_voice_id: clone.voiceId,
            clone_error: null,
            poll_count: nextPollCount,
            updated_at: now,
          })
          .eq("id", row.id);
        if (updateError) throw new Error(`Failed to mark clone ready ${row.id}: ${updateError.message}`);
        await settleGeneration(admin, row.generation_id, { ready: true });
        ready += 1;
        continue;
      }

      if (clone.status && FAILED_STATUSES.has(clone.status)) {
        const reason = clone.error ?? "Voice cloning failed without a reason";
        const { error: updateError } = await admin
          .from("voice_profiles")
          .update({
            clone_status: "failed",
            clone_error: reason,
            poll_count: nextPollCount,
            updated_at: now,
          })
          .eq("id", row.id);
        if (updateError) throw new Error(`Failed to mark clone failed ${row.id}: ${updateError.message}`);
        await settleGeneration(admin, row.generation_id, { ready: false, error: reason });
        failed += 1;
        continue;
      }

      const stuck = nextPollCount >= MAX_POLLS;
      const stuckReason = `Gave up after ${MAX_POLLS} checks, last status ${clone.status ?? "unknown"}`;
      const { error: updateError } = await admin
        .from("voice_profiles")
        .update({
          poll_count: nextPollCount,
          ...(stuck ? { clone_status: "failed", clone_error: stuckReason } : {}),
          updated_at: now,
        })
        .eq("id", row.id);
      if (updateError) throw new Error(`Failed to update poll count ${row.id}: ${updateError.message}`);
      if (stuck) {
        await settleGeneration(admin, row.generation_id, { ready: false, error: stuckReason });
        failed += 1;
      }
    } catch (caught) {
      // One provider error must not stop the batch: the next row may be fine,
      // and this one is retried on the next run with its count already raised.
      const message = caught instanceof Error ? caught.message : String(caught);
      log("error", "voice clone poll failed for one row", { traceId, error: message });
      await admin
        .from("voice_profiles")
        .update({ poll_count: nextPollCount, updated_at: now })
        .eq("id", row.id);
    }
  }

  log("info", "voice clones polled", { traceId, checked: rows.length, ready, failed });
  return json({ checked: rows.length, ready, failed });
});
