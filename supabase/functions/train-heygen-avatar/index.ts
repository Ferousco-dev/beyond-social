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
  /** What the owner calls this likeness in their library. */
  name?: string;
}

/** Kept short enough to read in a gallery tile. */
const MAX_NAME = 60;

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

  // Whether this is their first, which decides if it becomes the default.
  const { count } = await admin
    .from("heygen_avatars")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const hasAvatar = (count ?? 0) > 0;

  /*
   * The row is written before the provider is called, and regardless of whether
   * there is a provider to call.
   *
   * Somebody who records themselves has done the work whether or not this
   * deployment has credentials, and losing that because a key is missing would
   * mean asking them to do it again later. Training is what waits.
   */
  /*
   * Inserted, not upserted onto the owner.
   *
   * This used to upsert on `user_id`, which was unique, so recording a second
   * avatar silently replaced the first: the row moved to the new footage and
   * the old likeness became unreachable while still trained at the provider.
   * A person may hold several now, so each recording is its own row.
   */
  const trimmed = (body.name ?? "").trim().slice(0, MAX_NAME);
  const { data: created, error: upsertError } = await admin
    .from("heygen_avatars")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      consent_version: CONSENT_VERSION,
      // Stamped on every run, not only the first: a re-record is a new
      // attestation, and the old date would describe a recording that no
      // longer exists.
      consent_at: new Date().toISOString(),
      training_status: "pending",
      name: trimmed === "" ? null : trimmed,
      // The first avatar somebody records is the one to use until they say
      // otherwise. Later ones wait to be chosen.
      is_default: !hasAvatar,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  const avatarId = (created as { id: string } | null)?.id ?? "";
  if (upsertError || avatarId === "") {
    log("error", "heygen avatar row could not be saved", {
      traceId,
      error: upsertError?.message ?? "no id returned",
    });
    return json({ error: "could_not_save" }, 500);
  }

  if (!isHeygenConfigured()) {
    // Not an error. This deployment has no provider, the footage and the
    // consent are recorded, and training is picked up whenever a key exists.
    log("info", "heygen training skipped, provider unconfigured", { traceId });
    return json({ avatarId, status: "pending", trained: false, reason: "provider_unconfigured" });
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
    p_avatar: avatarId,
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

  try {
    const twin = await createDigitalTwin(name, file, requestId);

    /*
     * The group id is written the moment it is known, before consent is
     * submitted. HeyGen has already created and will bill this group, and the
     * catch block below only knows how to mark the row failed, not how to
     * attach an id it was never given. Recording it first means a consent
     * failure leaves the group findable and deletable rather than stranded at
     * the provider with nothing pointing at it.
     *
     * Scoped to this row, not to the owner. Each recording is its own row now,
     * so an update by user id would rewrite every avatar they have.
     */
    await admin
      .from("heygen_avatars")
      .update({
        provider_avatar_id: twin.groupId,
        provider_look_id: twin.lookId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", avatarId);

    // Consent is registered against the group HeyGen just created, using the
    // same footage: the recording opens with the statement read aloud, so it is
    // already the attestation on both sides and nobody is asked to repeat it.
    let consentStatus: string | null = null;
    let trainingError = twin.error;
    if (twin.groupId) {
      try {
        const consent = await submitConsent(twin.groupId, file, `${user.id}:${CONSENT_VERSION}`);
        consentStatus = consent.consentStatus;
      } catch (consentError) {
        // The group exists and is recorded above, so this is a failed twin
        // rather than a lost one.
        trainingError = consentError instanceof Error ? consentError.message : String(consentError);
      }
    }

    await admin
      .from("heygen_avatars")
      .update({
        provider_consent_status: consentStatus,
        // Still pending: HeyGen accepted the job, it has not finished it.
        training_status: trainingError ? "failed" : "pending",
        provider_error: trainingError,
        updated_at: new Date().toISOString(),
      })
      .eq("id", avatarId);

    log("info", "heygen training started", { traceId, groupId: twin.groupId ?? "" });
    return json({ avatarId, status: trainingError ? "failed" : "pending", trained: true });
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
      .eq("id", avatarId);
    return json({ error: "training_failed" }, 502);
  }
});
