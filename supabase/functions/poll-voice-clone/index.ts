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
    .select("id, voice_clone_id, poll_count")
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
        ready += 1;
        continue;
      }

      if (clone.status && FAILED_STATUSES.has(clone.status)) {
        const { error: updateError } = await admin
          .from("voice_profiles")
          .update({
            clone_status: "failed",
            clone_error: clone.error ?? "Voice cloning failed without a reason",
            poll_count: nextPollCount,
            updated_at: now,
          })
          .eq("id", row.id);
        if (updateError) throw new Error(`Failed to mark clone failed ${row.id}: ${updateError.message}`);
        failed += 1;
        continue;
      }

      const stuck = nextPollCount >= MAX_POLLS;
      const { error: updateError } = await admin
        .from("voice_profiles")
        .update({
          poll_count: nextPollCount,
          ...(stuck
            ? {
                clone_status: "failed",
                clone_error: `Gave up after ${MAX_POLLS} checks, last status ${clone.status ?? "unknown"}`,
              }
            : {}),
          updated_at: now,
        })
        .eq("id", row.id);
      if (updateError) throw new Error(`Failed to update poll count ${row.id}: ${updateError.message}`);
      if (stuck) failed += 1;
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
