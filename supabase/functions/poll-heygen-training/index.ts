// Scheduled endpoint: asks HeyGen how the twins it is training are getting on,
// and moves the rows that have finished.
//
// Training is not instant and HeyGen does not call back for it, so somebody has
// to ask. The same shape as poll-generation, which does this for kie renders,
// rather than a new mechanism: a batch, oldest first, bounded, and safe to run
// again if a run dies partway.
import { adminClient } from "../_shared/credits.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { getAvatarGroup, isHeygenConfigured } from "../_shared/heygen.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/** Bounded so one run cannot spend an unbounded amount of the provider's quota. */
const BATCH = 20;

/**
 * When a twin that never finishes is called stuck.
 *
 * At one poll every few minutes this is hours, far past HeyGen's own stated
 * training time. The point is not the exact number: it is that a row cannot sit
 * in 'pending' forever with nothing ever saying why, which is the state
 * somebody eventually reports as "it just never worked".
 */
const MAX_POLLS = 60;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const traceId = traceIdFrom(request);
  const secret = Deno.env.get("CRON_SECRET") ?? "";
  // Same rule as the app's cron routes: an unset secret closes the endpoint
  // rather than opening it to every caller that also sends nothing.
  if (secret === "" || request.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  if (!isHeygenConfigured()) {
    log("info", "heygen polling skipped, provider unconfigured", { traceId });
    return json({ checked: 0, reason: "provider_unconfigured" });
  }

  const admin = adminClient();
  const { data, error } = await admin.rpc("pending_heygen_avatars", { p_limit: BATCH });
  if (error) {
    log("error", "could not list pending heygen avatars", { traceId, error: error.message });
    return json({ error: "query_failed" }, 500);
  }

  const rows = (data ?? []) as {
    user_id: string;
    provider_avatar_id: string;
    poll_count: number;
  }[];

  let ready = 0;
  let failed = 0;

  for (const row of rows) {
    const now = new Date().toISOString();
    try {
      const group = await getAvatarGroup(row.provider_avatar_id);

      if (group.status === "completed") {
        await admin
          .from("heygen_avatars")
          .update({
            training_status: "ready",
            provider_voice_id: group.defaultVoiceId,
            provider_consent_status: group.consentStatus,
            trained_at: now,
            poll_count: row.poll_count + 1,
            provider_error: null,
            updated_at: now,
          })
          .eq("user_id", row.user_id);
        ready += 1;
        continue;
      }

      if (group.status === "failed") {
        await admin
          .from("heygen_avatars")
          .update({
            training_status: "failed",
            provider_error: group.error ?? "Training failed without a reason",
            poll_count: row.poll_count + 1,
            updated_at: now,
          })
          .eq("user_id", row.user_id);
        failed += 1;
        continue;
      }

      /*
       * `pending_consent` is neither failure nor progress: HeyGen is waiting on
       * the consent it was sent, and the row stays pending. Recorded rather than
       * swallowed, because a twin stuck there means our consent submission did
       * not land, which is a different problem from slow training.
       */
      const stuck = row.poll_count + 1 >= MAX_POLLS;
      await admin
        .from("heygen_avatars")
        .update({
          poll_count: row.poll_count + 1,
          provider_consent_status: group.consentStatus,
          ...(stuck
            ? {
                training_status: "failed",
                provider_error: `Gave up after ${MAX_POLLS} checks, last status ${group.status ?? "unknown"}`,
              }
            : {}),
          updated_at: now,
        })
        .eq("user_id", row.user_id);
      if (stuck) failed += 1;
    } catch (caught) {
      // One provider error must not stop the batch: the next row may be fine,
      // and this one is retried on the next run with its count already raised.
      const message = caught instanceof Error ? caught.message : String(caught);
      log("error", "heygen poll failed for one avatar", { traceId, error: message });
      await admin
        .from("heygen_avatars")
        .update({ poll_count: row.poll_count + 1, updated_at: now })
        .eq("user_id", row.user_id);
    }
  }

  log("info", "heygen training polled", { traceId, checked: rows.length, ready, failed });
  return json({ checked: rows.length, ready, failed });
});
