// Scheduled endpoint: asks HeyGen how the twins it is training are getting on,
// and moves the rows that have finished.
//
// Training is not instant and HeyGen does not call back for it, so somebody has
// to ask. The same shape as poll-generation, which does this for kie renders,
// rather than a new mechanism: a batch, oldest first, bounded, and safe to run
// again if a run dies partway.
import { adminClient } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { getAvatarGroup, getAvatarLook, isHeygenConfigured } from "../_shared/heygen.ts";
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

serve(async (request) => {
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
    id: string;
    user_id: string;
    provider_avatar_id: string;
    provider_look_id: string | null;
    poll_count: number;
  }[];

  let ready = 0;
  let failed = 0;

  for (const row of rows) {
    const now = new Date().toISOString();
    try {
      const [group, look] = await Promise.all([
        getAvatarGroup(row.provider_avatar_id),
        row.provider_look_id ? getAvatarLook(row.provider_look_id) : Promise.resolve(null),
      ]);
      const lookStatus = look?.status ?? null;
      const voiceId = group.defaultVoiceId ?? look?.defaultVoiceId ?? null;

      if (group.status === "completed" && lookStatus === "completed" && voiceId) {
        await admin
          .from("heygen_avatars")
          .update({
            training_status: "ready",
            provider_voice_id: voiceId,
            provider_consent_status: group.consentStatus,
            provider_consent_url: null,
            provider_consent_url_expires_at: null,
            trained_at: now,
            poll_count: row.poll_count + 1,
            provider_error: null,
            updated_at: now,
          })
          .eq("id", row.id);
        ready += 1;
        continue;
      }

      if (group.status === "failed" || lookStatus === "failed") {
        await admin
          .from("heygen_avatars")
          .update({
            training_status: "failed",
            provider_error: group.error ?? look?.error ?? "Training failed without a reason",
            provider_consent_status: group.consentStatus,
            poll_count: row.poll_count + 1,
            updated_at: now,
          })
          .eq("id", row.id);
        failed += 1;
        continue;
      }

      /*
       * `pending_consent` is neither failure nor progress: HeyGen is waiting on
       * the hosted consent page. The row stays pending and keeps its consent
       * link so the user can return to the same self-service flow.
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
                provider_error: `Gave up after ${MAX_POLLS} checks, last group status ${group.status ?? "unknown"}, look status ${lookStatus ?? "unknown"}`,
              }
            : {}),
          updated_at: now,
        })
        .eq("id", row.id);
      if (stuck) failed += 1;
    } catch (caught) {
      // One provider error must not stop the batch: the next row may be fine,
      // and this one is retried on the next run with its count already raised.
      const message = caught instanceof Error ? caught.message : String(caught);
      log("error", "heygen poll failed for one avatar", { traceId, error: message });
      await admin
        .from("heygen_avatars")
        .update({ poll_count: row.poll_count + 1, updated_at: now })
        .eq("id", row.id);
    }
  }

  log("info", "heygen training polled", { traceId, checked: rows.length, ready, failed });
  return json({ checked: rows.length, ready, failed });
});
