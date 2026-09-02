// Scheduled endpoint: asks HeyGen how the twin videos it is rendering are
// getting on, and settles the rows that have finished.
//
// `poll-heygen-training` does this for twins being trained; this does it for
// the videos they are then asked to speak. Same shape, and for the same reason:
// nothing calls back, so somebody has to ask. Without it a twin video sits at
// `generating` forever with its credit held, which is the exact state
// `reconcile-generations` exists to clean up after rather than to be the normal
// end of a render.
//
// Idempotent by construction. `complete_generation` and `fail_generation_by_id`
// both refuse a row that has already settled and report whether they actually
// moved it, so a batch that dies halfway through and runs again charges and
// refunds nothing twice.
import { adminClient } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { getVideo, isHeygenConfigured } from "../_shared/heygen.ts";
import { persistRender } from "../_shared/store.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/** Bounded so one run cannot spend an unbounded amount of the provider's quota. */
const BATCH = 20;

/**
 * When a render that never finishes is called stuck.
 *
 * Well past anything HeyGen states for a script of the length this endpoint
 * accepts, and deliberately shorter than `reconcile-generations`' own sweep is
 * generous, because this one has actually asked the provider rather than
 * guessed. The point is not the exact number: it is that a row cannot sit at
 * `generating` forever holding a credit with nothing ever saying why.
 */
const MAX_AGE_MINUTES = 60;

const STUCK_REASON =
  "This video did not finish rendering in time. Your credits have been refunded.";

interface PendingRow {
  id: string;
  user_id: string;
  provider_task_id: string;
  created_at: string;
}

serve(async (request) => {
  const traceId = traceIdFrom(request);
  const secret = Deno.env.get("CRON_SECRET") ?? "";
  // Same rule as the app's cron routes: an unset secret closes the endpoint
  // rather than opening it to every caller that also sends nothing.
  if (secret === "" || request.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  if (!isHeygenConfigured()) {
    log("info", "heygen video polling skipped, provider unconfigured", { traceId });
    return json({ checked: 0, reason: "provider_unconfigured" });
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from("video_generations")
    .select("id, user_id, provider_task_id, created_at")
    .eq("provider", "heygen")
    .eq("status", "generating")
    .not("provider_task_id", "is", null)
    // Oldest first, so a backlog drains in the order people are waiting in
    // rather than starving whoever asked first.
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    log("error", "could not list pending heygen videos", { traceId, error: error.message });
    return json({ error: "query_failed" }, 500);
  }

  const rows = (data ?? []) as PendingRow[];
  let ready = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const video = await getVideo(row.provider_task_id);

      if (video.status === "completed" && video.videoUrl) {
        /*
         * Copied into our own bucket before the row is settled. HeyGen's result
         * URL is temporary, and a row completed against one looks fine until it
         * expires, which is long after anybody would connect the two.
         */
        const resultUrl = await persistRender(
          admin,
          row.user_id,
          row.provider_task_id,
          video.videoUrl,
        );
        const { error: completeError } = await admin.rpc("complete_generation", {
          p_provider_task_id: row.provider_task_id,
          p_result_url: resultUrl,
        });
        if (completeError) {
          // Left at `generating` on purpose: the next run asks again. Announcing
          // a completion the row never took is how a spinner becomes a lie.
          log("error", "could not complete a twin video", {
            traceId,
            generationId: row.id,
            error: completeError.message,
          });
          continue;
        }
        ready += 1;
        continue;
      }

      if (video.status === "failed") {
        await admin.rpc("fail_generation_by_id", {
          p_generation: row.id,
          p_error: video.error ?? "The provider could not render this video",
        });
        failed += 1;
        continue;
      }

      const ageMinutes = (Date.now() - new Date(row.created_at).getTime()) / 60_000;
      if (ageMinutes >= MAX_AGE_MINUTES) {
        await admin.rpc("fail_generation_by_id", { p_generation: row.id, p_error: STUCK_REASON });
        failed += 1;
      }
    } catch (caught) {
      // One provider error must not stop the batch: the next row may be fine,
      // and this one is retried on the next run. Nothing is settled here, so a
      // provider that is merely down for a minute costs nobody their credits.
      const message = caught instanceof Error ? caught.message : String(caught);
      log("error", "heygen poll failed for one video", {
        traceId,
        generationId: row.id,
        error: message,
      });
    }
  }

  log("info", "heygen videos polled", { traceId, checked: rows.length, ready, failed });
  return json({ checked: rows.length, ready, failed });
});
