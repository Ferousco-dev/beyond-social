// Authenticated endpoint: makes a video of the caller's trained digital twin
// speaking a script.
//
// The end of the chain that starts with the recording: footage becomes a twin,
// the twin is trained, and this is what it was trained for.
//
// Ships without charging anything. HeyGen bills a subscription plus a rate per
// minute of output, which does not divide into this app's integer credit
// ledger, and BACKLOG.md's standing rule is that nothing goes active on a
// guessed price. So the path is built, gated, and refuses rather than
// pretending a number: see PRICING below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { adminClient } from "../_shared/credits.ts";
import { json, serve } from "../_shared/http.ts";
import { createAvatarVideo, isHeygenConfigured } from "../_shared/heygen.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/**
 * PRICING, deliberately unresolved.
 *
 * Set HEYGEN_CREDIT_COST to the number of this app's credits one twin video
 * should cost, once a real rate exists and somebody has decided how HeyGen's
 * per-minute billing maps onto a flat per-run charge. Until then this endpoint
 * refuses, because the alternatives are worse: charging a guessed number takes
 * money for something nobody priced, and charging nothing makes an unbounded
 * provider bill available to anybody with an account.
 */
function creditCost(): number | null {
  const raw = Deno.env.get("HEYGEN_CREDIT_COST") ?? "";
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Long enough to be a real script, short enough to bound one render. */
const MAX_SCRIPT = 1500;

interface GenerateBody {
  script?: string;
  title?: string;
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

  if (!isHeygenConfigured()) return json({ error: "provider_unconfigured" }, 503);

  const cost = creditCost();
  if (cost === null) {
    // Not a bug and not a stub: the price is a decision nobody has made.
    log("info", "heygen generation refused, unpriced", { traceId });
    return json({ error: "unpriced", detail: "HEYGEN_CREDIT_COST is not set" }, 503);
  }

  const body = (await request.json().catch(() => ({}))) as GenerateBody;
  const script = (body.script ?? "").trim();
  if (script === "") return json({ error: "missing_script" }, 400);
  if (script.length > MAX_SCRIPT) return json({ error: "script_too_long", max: MAX_SCRIPT }, 400);

  const admin = adminClient();
  const { data: avatar, error: avatarError } = await admin
    .from("heygen_avatars")
    .select("provider_look_id, provider_voice_id, training_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (avatarError) {
    log("error", "could not read the caller's twin", { traceId, error: avatarError.message });
    return json({ error: "lookup_failed" }, 500);
  }

  const twin = avatar as {
    provider_look_id: string | null;
    provider_voice_id: string | null;
    training_status: string;
  } | null;

  if (!twin) return json({ error: "no_avatar" }, 404);
  if (twin.training_status !== "ready") {
    // Distinguished from "no avatar" on purpose: one means record yourself, the
    // other means wait, and telling somebody to record again while their first
    // recording is still training is how they end up with two.
    return json({ error: "not_ready", status: twin.training_status }, 409);
  }
  if (!twin.provider_look_id || !twin.provider_voice_id) {
    return json({ error: "incomplete_avatar" }, 409);
  }

  try {
    const videoId = await createAvatarVideo({
      avatarId: twin.provider_look_id,
      voiceId: twin.provider_voice_id,
      script,
      ...(body.title ? { title: body.title.slice(0, 120) } : {}),
    });

    log("info", "heygen video requested", { traceId, videoId });
    // The video is not charged here. When a price exists, the credit
    // reservation belongs immediately before this call and never after it, the
    // same order generate-video already uses, so a failed dispatch cannot leave
    // somebody paying for a render that never started.
    return json({ videoId, status: "pending" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "heygen video request failed", { traceId, error: message });
    return json({ error: "generation_failed" }, 502);
  }
});
