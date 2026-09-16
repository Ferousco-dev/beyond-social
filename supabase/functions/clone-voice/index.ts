// Authenticated endpoint: clones the caller's enrolled voice clip with
// HeyGen, so it can later say typed text it never recorded.
//
// The end of the enrolment chain that starts in features/voice: a clip is
// recorded, saved to voice_profiles, and this is what turns it into something
// that can speak arbitrary text. Async at the provider, so this only submits
// the job and records that it is pending; poll-voice-clone is what settles it.
//
// Separately priced from an avatar generation, on purpose: cloning creates a
// reusable asset, a generation is a single render, and generate-avatar folds
// the cost of using an already-cloned voice into its own price rather than
// charging twice for the same voice on every render (see avatar-actions.ts).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { abandonRun, adminClient, reserveCreditsAt } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { cloneVoice, isHeygenConfigured } from "../_shared/heygen.ts";
import { handToProvider } from "../_shared/reference.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/**
 * PRICING, deliberately unresolved until an owner sets it.
 *
 * Same refusal shape as generate-heygen-avatar's creditCost(): zero is
 * refused alongside unset, because a run reserved at zero would still be
 * charged a credit when it settles (complete_generation falls back to the
 * base rate for a model it does not find in model_catalog, and this model is
 * deliberately absent from it, the same as heygen/avatar-v).
 */
function creditCost(): number | null {
  const raw = Deno.env.get("VOICE_CLONE_CREDIT_COST") ?? "";
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 1 ? value : null;
}

/** Named on the row for the same reason heygen/avatar-v is: there is no price row for it. */
const MODEL = "heygen/voice-clone";

serve(async (request) => {
  const traceId = traceIdFrom(request);
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const configured = isHeygenConfigured();
  const cost = creditCost();

  const body = (await request.json().catch(() => ({}))) as { probe?: boolean };
  if (body.probe === true) {
    const reason = !configured ? "provider_unconfigured" : cost === null ? "unpriced" : null;
    return json({ ready: reason === null, reason, cost });
  }

  if (!configured) return json({ error: "provider_unconfigured" }, 503);
  if (cost === null) {
    log("info", "voice clone refused, unpriced", { traceId });
    return json({ error: "unpriced", detail: "VOICE_CLONE_CREDIT_COST is not set" }, 503);
  }

  const { data: profile, error: profileError } = await supabase
    .from("voice_profiles")
    .select("id, storage_path, clone_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    log("error", "could not read voice profile", { traceId, error: profileError.message });
    return json({ error: "could_not_read_profile" }, 500);
  }
  const row = profile as { id: string; storage_path: string; clone_status: string } | null;
  if (!row) return json({ error: "no_enrolled_voice" }, 404);
  if (row.clone_status === "pending" || row.clone_status === "ready") {
    return json({ error: "already_cloned", status: row.clone_status }, 409);
  }

  /*
   * `video_generations.project_id` is not nullable (0002, unchanged by 0092),
   * so a run that is not really "in" a project still has to be filed under
   * one. Cloning is done from the account settings page, which has no project
   * open, so the caller's most recently touched project stands in for it: the
   * same choice `generate-heygen-avatar` avoids only because it already takes
   * `projectId` from a chat composer that has one.
   */
  const { data: anyProject } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!anyProject) return json({ error: "no_project" }, 400);

  const admin = adminClient();

  // The row exists before the provider is called: credits are taken before
  // dispatch and the reservation needs something to hang off, the same
  // ordering generate-heygen-avatar and generate-avatar already use.
  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: anyProject.id,
      user_id: user.id,
      provider: "heygen",
      model: MODEL,
      prompt: "Voice clone",
      status: "queued",
      trace_id: traceId,
    })
    .select("id")
    .single();
  if (insertError || !generation) {
    log("error", "could not record the voice clone run", { traceId, error: insertError?.message });
    return json({ error: "could_not_record" }, 500);
  }

  const reservation = await reserveCreditsAt(admin, generation.id, cost);
  if (!reservation.held) {
    log("error", "voice clone credit reservation refused", {
      traceId,
      generationId: generation.id,
    });
    await abandonRun(admin, generation.id, reservation.reason);
    return json({ error: reservation.reason, generationId: generation.id }, reservation.status);
  }

  try {
    const clipUrl = await handToProvider(supabase, "uploads", row.storage_path, traceId);
    const result = await cloneVoice(
      `voice-${user.id.slice(0, 8)}`,
      { type: "url", url: clipUrl },
      generation.id,
    );
    if (!result.voiceCloneId) {
      throw new Error(result.error ?? "HeyGen accepted no voice_clone_id");
    }

    const { error: updateError } = await admin
      .from("voice_profiles")
      .update({
        clone_status: "pending",
        voice_clone_id: result.voiceCloneId,
        clone_error: null,
        // What poll-voice-clone settles once the clone resolves: without
        // this, the credit reserved above stays held against a row nothing
        // ever marks ready or refunds.
        generation_id: generation.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (updateError) {
      // We cannot safely poll a provider job we failed to persist. Treat the
      // submission as failed on our side and return the held credits, which
      // preserves the endpoint's all-failure refund contract.
      log("error", "could not record pending voice clone", { traceId, error: updateError.message });
      throw new Error("Could not record the pending voice clone");
    }

    log("info", "voice clone submitted", {
      traceId,
      voiceCloneId: result.voiceCloneId,
      generationId: generation.id,
    });
    return json({
      status: "pending",
      voiceCloneId: result.voiceCloneId,
      generationId: generation.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "voice clone failed", { traceId, error: message });
    await abandonRun(admin, generation.id, message);
    await admin
      .from("voice_profiles")
      .update({
        clone_status: "failed",
        clone_error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return json({ error: "clone_failed", generationId: generation.id }, 502);
  }
});
