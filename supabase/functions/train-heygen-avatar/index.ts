// Authenticated endpoint: starts training a digital twin from footage the
// caller has already recorded and uploaded, and registers consent with the
// provider in the same pass.
//
// Deliberately not a branch inside generate-avatar. That function renders one
// video from a photo and an audio clip, charges credits for it, and is finished.
// This one creates a persistent likeness that outlives every render made from
// it, is billed on a subscription rather than per run, and carries its own
// consent record. Sharing a function would mean threading a provider switch
// through every line of both.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { adminClient } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { createDigitalTwin, isHeygenConfigured, submitConsent } from "../_shared/heygen.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/**
 * Bumped with the wording in `features/live-avatar/consent.ts`.
 *
 * Duplicated because an edge function cannot import from the app, and the same
 * drift has already bitten generate-avatar once: its copy read 1 while the app
 * had moved to 2, which refused every render from somebody who had accepted the
 * current wording. Change both.
 */
const CONSENT_VERSION = 1;

/**
 * How long HeyGen has to fetch the footage.
 *
 * Long enough that a queued training job does not fail on an expired link after
 * the row already says pending, which is exactly the failure kie.ts documents
 * hitting with two-hour signatures.
 */
const FOOTAGE_URL_SECONDS = 60 * 60 * 24;

interface TrainBody {
  storagePath?: string;
  consentVersion?: number;
  name?: string;
}

serve(async (request) => {
  const traceId = traceIdFrom(request);
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await request.json().catch(() => ({}))) as TrainBody;
  const storagePath = (body.storagePath ?? "").trim();
  if (storagePath === "") return json({ error: "missing_footage" }, 400);

  // The prefix is the owner's id by construction everywhere footage is written,
  // so a path outside it is either a bug or an attempt to train on somebody
  // else's recording.
  if (!storagePath.startsWith(`${user.id}/`)) return json({ error: "forbidden" }, 403);

  if (body.consentVersion !== CONSENT_VERSION) {
    return json({ error: "consent_required", version: CONSENT_VERSION }, 412);
  }

  const admin = adminClient();

  /*
   * The row is written before the provider is called, and regardless of whether
   * there is a provider to call.
   *
   * Somebody who records themselves has done the work whether or not this
   * deployment has credentials, and losing that because a key is missing would
   * mean asking them to do it again later. Training is what waits.
   */
  const { error: upsertError } = await admin.from("heygen_avatars").upsert(
    {
      user_id: user.id,
      storage_path: storagePath,
      consent_version: CONSENT_VERSION,
      // Stamped on every run, not only the first: a re-record is a new
      // attestation, and the old date would describe a recording that no
      // longer exists.
      consent_at: new Date().toISOString(),
      training_status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (upsertError) {
    log("error", "heygen avatar row could not be saved", { traceId, error: upsertError.message });
    return json({ error: "could_not_save" }, 500);
  }

  if (!isHeygenConfigured()) {
    // Not an error. This deployment has no provider, the footage and the
    // consent are recorded, and training is picked up whenever a key exists.
    log("info", "heygen training skipped, provider unconfigured", { traceId });
    return json({ status: "pending", trained: false, reason: "provider_unconfigured" });
  }

  /*
   * The claim is taken before anything is dispatched, and it is the whole
   * defence. A retry, a double submit, or a client that gave up on a slow
   * response used to dispatch a second training job, and each one is a
   * separately trained copy of somebody's face and voice at a third party.
   * Only the last id ever reached the row, so the rest became orphans the
   * deletion path could not name.
   */
  const requestId = crypto.randomUUID();
  const { data: claimed, error: claimError } = await admin.rpc("claim_twin_training", {
    p_user: user.id,
    p_request: requestId,
  });
  if (claimError) {
    log("error", "could not claim twin training", { traceId, error: claimError.message });
    return json({ error: "could_not_save" }, 500);
  }
  if (claimed !== true) {
    // Not an error to the caller: their training is already running. Answering
    // 409 rather than 200 keeps a retry loop from reading this as "start again".
    log("info", "twin training already in flight", { traceId });
    return json({ status: "pending", trained: false, reason: "already_training" }, 409);
  }

  const { data: signed, error: signError } = await admin.storage
    .from("uploads")
    .createSignedUrl(storagePath, FOOTAGE_URL_SECONDS);
  if (signError || !signed) {
    log("error", "could not sign twin footage", { traceId, error: signError?.message ?? "no url" });
    return json({ error: "could_not_read_footage" }, 500);
  }

  const file = { type: "url", url: signed.signedUrl } as const;
  const name = (body.name ?? "").trim() || `Twin ${user.id.slice(0, 8)}`;

  // Read before the dispatch so a group that gets displaced can be recorded
  // rather than silently left at the provider.
  const { data: existing } = await admin
    .from("heygen_avatars")
    .select("provider_avatar_id")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const created = await createDigitalTwin(name, file, requestId);

    const previous = (existing as { provider_avatar_id?: string | null } | null)
      ?.provider_avatar_id;
    if (previous && created.groupId && previous !== created.groupId) {
      await admin.rpc("orphan_twin_avatar", { p_user: user.id, p_avatar_id: previous });
      log("warn", "a previous twin avatar was displaced and recorded as an orphan", {
        traceId,
        previous,
      });
    }

    // Consent is registered against the group HeyGen just created, using the
    // same footage: the recording opens with the statement read aloud, so it is
    // already the attestation on both sides and nobody is asked to repeat it.
    let consentStatus: string | null = null;
    if (created.groupId) {
      const consent = await submitConsent(created.groupId, file, `${user.id}:${CONSENT_VERSION}`);
      consentStatus = consent.consentStatus;
    }

    await admin
      .from("heygen_avatars")
      .update({
        provider_avatar_id: created.groupId,
        provider_look_id: created.lookId,
        provider_consent_status: consentStatus,
        // Still pending: HeyGen accepted the job, it has not finished it.
        training_status: created.error ? "failed" : "pending",
        provider_error: created.error,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    log("info", "heygen training started", { traceId, groupId: created.groupId ?? "" });
    return json({ status: created.error ? "failed" : "pending", trained: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "heygen training failed", { traceId, error: message });
    await admin
      .from("heygen_avatars")
      .update({
        training_status: "failed",
        provider_error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    return json({ error: "training_failed" }, 502);
  }
});
