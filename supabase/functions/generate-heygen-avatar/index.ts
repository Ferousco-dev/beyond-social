// Authenticated endpoint: makes a video of the caller's trained digital twin
// speaking a script.
//
// The end of the chain that starts with the recording: footage becomes a twin,
// the twin is trained, and this is what it was trained for.
//
// Records the run as a `video_generations` row, holds the credits before the
// provider is called, and gives them back when nothing came of it, which is
// what `generate-video` does and for the same reasons. Everything downstream,
// the poller, the refund, the library, hangs off that row rather than off a
// provider id handed back to a browser that may have closed.
//
// Still gated: HeyGen bills a subscription plus a rate per minute of output,
// which does not divide into this app's integer credit ledger, and BACKLOG.md's
// standing rule is that nothing goes active on a guessed price. So the path is
// built, wired and inert: see PRICING below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { abandonRun, adminClient, reserveCreditsAt } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { createAvatarVideo, isHeygenConfigured } from "../_shared/heygen.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";
import { findTwin } from "./twin.ts";

/**
 * PRICING, deliberately unresolved.
 *
 * Set HEYGEN_CREDIT_COST to the number of this app's credits one twin video
 * should cost, once a real rate exists and somebody has decided how HeyGen's
 * per-minute billing maps onto a flat per-run charge. Until then this endpoint
 * refuses, because the alternatives are worse: charging a guessed number takes
 * money for something nobody priced, and charging nothing makes an unbounded
 * provider bill available to anybody with an account.
 *
 * Zero is refused alongside unset rather than treated as free. `model_catalog`
 * has no row for this model, and `complete_generation` falls back to the base
 * rate for a model it cannot find, so a run reserved at zero would still be
 * charged one credit when it settled. A price that is not what the account is
 * billed is worse than no price at all.
 */
function creditCost(): number | null {
  const raw = Deno.env.get("HEYGEN_CREDIT_COST") ?? "";
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 1 ? value : null;
}

/** Long enough to be a real script, short enough to bound one render. */
const MAX_SCRIPT = 1500;

/**
 * Named on the row so the poller knows which provider to ask and the library
 * knows what it is looking at. Deliberately absent from `model_catalog`: a row
 * there is a price, and there is no price.
 */
const MODEL = "heygen/avatar-v";

interface GenerateBody {
  /** The conversation the render is filed under, as every other generation is. */
  projectId?: string;
  script?: string;
  title?: string;
  /** Which likeness speaks. Absent means the caller's default. */
  avatarId?: string;
  /** Asks only whether this endpoint would run, without starting anything. */
  probe?: boolean;
}

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

  const body = (await request.json().catch(() => ({}))) as GenerateBody;
  const configured = isHeygenConfigured();
  const cost = creditCost();

  /*
   * The probe exists so the screen can say why the button is unavailable before
   * somebody writes a script into it. Both gates are environment the app server
   * does not hold, and mirroring them into a second place to read locally is
   * two sources that disagree the first time one is changed.
   */
  if (body.probe === true) {
    const reason = !configured ? "provider_unconfigured" : cost === null ? "unpriced" : null;
    return json({ ready: reason === null, reason, cost });
  }

  if (!configured) return json({ error: "provider_unconfigured" }, 503);
  if (cost === null) {
    // Not a bug and not a stub: the price is a decision nobody has made.
    log("info", "heygen generation refused, unpriced", { traceId });
    return json({ error: "unpriced", detail: "HEYGEN_CREDIT_COST is not set" }, 503);
  }

  const script = (body.script ?? "").trim();
  if (script === "") return json({ error: "missing_script" }, 400);
  if (script.length > MAX_SCRIPT) return json({ error: "script_too_long", max: MAX_SCRIPT }, 400);
  if (!body.projectId) return json({ error: "missing_project" }, 400);

  const found = await findTwin(supabase, body.avatarId);
  if (!found.ok) {
    if (found.status === 500) {
      log("error", "could not read the caller's twin", { traceId, error: found.detail ?? "" });
    }
    return json(
      { error: found.error, ...(found.detail ? { detail: found.detail } : {}) },
      found.status,
    );
  }
  const twin = found.twin;

  /*
   * The row exists before the provider is called, because the credits are taken
   * before the provider is called and the reservation needs something to hang
   * off. `queued` is the honest state for it: accepted here, not dispatched.
   * Written under the caller's own client, so the insert policy is what proves
   * the project is theirs.
   */
  const title = body.title?.trim().slice(0, 120) ?? "";
  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: body.projectId,
      user_id: user.id,
      provider: "heygen",
      model: MODEL,
      prompt: script,
      heygen_avatar_id: twin.id,
      status: "queued",
      // Carried on the row because completion happens in a different process,
      // minutes later, where no header from the original request survives.
      trace_id: traceId,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    log("error", "could not record the twin generation", { traceId, error: insertError?.message });
    return json({ error: "could_not_record" }, 500);
  }

  // Nothing is dispatched until the credits are actually held.
  const admin = adminClient();
  const reservation = await reserveCreditsAt(admin, generation.id, cost);
  if (!reservation.held) {
    log("error", "credit reservation refused", { traceId, generationId: generation.id });
    await abandonRun(admin, generation.id, reservation.reason);
    return json({ error: reservation.reason, generationId: generation.id }, reservation.status);
  }

  let videoId: string;
  try {
    videoId = await createAvatarVideo({
      avatarId: twin.lookId,
      voiceId: twin.voiceId,
      script,
      ...(title ? { title } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Nothing rendered, so the reservation is given back on the way out.
    await abandonRun(admin, generation.id, "That video could not be started");
    log("error", "heygen video request failed", { traceId, error: message });
    return json({ error: "generation_failed", generationId: generation.id }, 502);
  }

  /*
   * The video id closes the loop: it is what the poller looks the row up by.
   * Written under the service role because the row is only insertable by its
   * owner, not updatable.
   */
  const { error: dispatchError } = await admin
    .from("video_generations")
    .update({ status: "generating", provider_task_id: videoId })
    .eq("id", generation.id);

  if (dispatchError) {
    // The render is running and we cannot follow it, so it can only be settled
    // as failed. Refunding is the right side to err on: we cannot show a result
    // we have lost the handle to.
    log("error", "could not record the dispatched twin video", { traceId, videoId });
    await abandonRun(admin, generation.id, "Could not follow this render");
    return json({ error: "could_not_record", generationId: generation.id }, 500);
  }

  log("info", "heygen video requested", { traceId, videoId, generationId: generation.id });
  return json({ generationId: generation.id, videoId, status: "generating" });
});
