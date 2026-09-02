// Authenticated endpoint: starts a kie.ai video generation for the signed-in
// user and records the task.
//
// The credits are taken here, before the provider is called, by the one
// statement that checks the balance and debits it. The profile counters this
// used to read were a second source that could disagree with the ledger the
// charge actually lands in, and reading them proved nothing about what the
// balance would still be a moment later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/http.ts";
import { callbackUrl } from "../_shared/kie-callback-auth.ts";
import { createMarketVideoTask, createVideoTask } from "../_shared/kie.ts";
import { buildMarketInput, UnsupportedModelError } from "../_shared/kie-models.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

import { abandonRun, adminClient, reserveCredits } from "../_shared/credits.ts";
import { handFootageOver, handStillsOver } from "./inputs.ts";
import { planRun } from "./plan.ts";

interface GenerateBody {
  projectId?: string;
  prompt?: string;
  aspectRatio?: string;
  imageUrls?: string[];
  /** Object paths in the uploads bucket, preferred over imageUrls. */
  imagePaths?: string[];
  /**
   * Object paths in the video-uploads bucket, for models that edit footage or
   * copy motion from it. A separate bucket from the stills because the size
   * ceiling and the allowed types are different.
   */
  videoPaths?: string[];
  /** Which video model to run. Validated against the catalogue. */
  model?: string;
  /** Seconds. Only present when the request actually asked for a length. */
  duration?: number;
  /**
   * Beats to cut between, for models that generate several shots in one call.
   * Absent means one continuous take, which is a different request rather than
   * a shorter version of this one.
   */
  shots?: { prompt?: string; duration?: number }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  const traceId = traceIdFrom(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const prompt = body.prompt?.trim();
  if (!body.projectId || !prompt) {
    return json({ error: "projectId and prompt are required" }, 400);
  }

  const aspectRatio =
    body.aspectRatio === "16:9" || body.aspectRatio === "Auto" ? body.aspectRatio : "9:16";

  const callBackUrl = callbackUrl();

  let referenceUrls: string[] | undefined;
  try {
    referenceUrls = await handStillsOver(
      supabase,
      { paths: body.imagePaths, urls: body.imageUrls },
      traceId,
    );
  } catch (error) {
    log("error", "could not hand the reference image to the provider", { traceId });
    return json(
      { error: error instanceof Error ? error.message : "Could not prepare the reference image" },
      502,
    );
  }

  let footageUrls: string[];
  try {
    footageUrls = await handFootageOver(supabase, body.videoPaths, traceId);
  } catch (error) {
    log("error", "could not hand the reference video to the provider", { traceId });
    return json(
      { error: error instanceof Error ? error.message : "Could not prepare the reference video" },
      502,
    );
  }

  const planned = await planRun(supabase, {
    model: body.model,
    duration: body.duration,
    shots: body.shots,
  });
  if (!planned.ok) return json({ error: planned.error }, planned.status);
  const { model, duration, shots, isVeo } = planned.plan;

  /*
   * A market model's request shape is checked before anything is created, not
   * only before it is sent.
   *
   * `createMarketVideoTask` already refused an unaddressable shape, missing
   * footage for motion control, an image where a model wants a video, but
   * only once it ran, which by then was after the row existed and the credits
   * were already held: a request that could never have worked reserved and
   * then immediately refunded a charge for nothing. This is the same check,
   * run before either exists, so that request now costs a row in the table
   * exactly as little as a `planRun` rejection does, which is none.
   */
  if (!isVeo) {
    try {
      buildMarketInput(model, {
        prompt,
        imageUrls: referenceUrls ?? [],
        videoUrls: footageUrls,
        aspectRatio,
        duration,
        shots,
      });
    } catch (error) {
      if (error instanceof UnsupportedModelError) {
        log("error", "refused a request with an unaddressable shape before reserving credits", {
          traceId,
          model,
        });
        return json({ error: error.message }, 400);
      }
      throw error;
    }
  }

  /*
   * The row is written before the provider is called, because the credits are
   * taken before the provider is called and the reservation needs something to
   * hang off. `queued` is the honest state for it: accepted here, not yet
   * dispatched. The poller already treats a row with no task id as nothing to
   * ask about.
   */
  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: body.projectId,
      user_id: user.id,
      prompt,
      aspect_ratio: aspectRatio,
      duration,
      image_urls: body.imageUrls ?? [],
      status: "queued",
      // Recorded so completion prices this against the model that actually ran,
      // and so polling knows which status endpoint to ask.
      model,
      // Carried on the row because the callback arrives in a different process,
      // minutes later, where no header from the original request survives.
      trace_id: traceId,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    log("error", "could not record the generation", { traceId });
    return json({ error: "Could not record the generation" }, 500);
  }

  // Nothing is dispatched until the credits are actually held.
  const admin = adminClient();
  const reservation = await reserveCredits(admin, generation.id);
  if (!reservation.held) {
    log("error", "credit reservation refused", {
      traceId,
      generationId: generation.id,
      model,
    });
    await abandonRun(admin, generation.id, reservation.reason);
    return json({ error: reservation.reason, generationId: generation.id }, reservation.status);
  }

  let taskId: string;
  try {
    taskId = isVeo
      ? await createVideoTask({
          model,
          prompt,
          imageUrls: referenceUrls,
          aspectRatio,
          duration,
          callBackUrl,
        })
      : await createMarketVideoTask({
          model,
          prompt,
          imageUrls: referenceUrls ?? [],
          videoUrls: footageUrls,
          aspectRatio,
          duration,
          shots,
          callBackUrl,
        });
  } catch (error) {
    /*
     * A model we cannot address correctly is refused before anything is
     * dispatched, so it is the caller's request that is wrong, not the
     * provider that is down. Reporting it as 502 would blame kie for a shape
     * this code chose.
     */
    const message = error instanceof Error ? error.message : "Generation failed";
    // Nothing rendered, so the reservation is given back on the way out.
    await abandonRun(admin, generation.id, message);
    if (error instanceof UnsupportedModelError) {
      log("error", "refused to dispatch a model with an unknown request shape", {
        traceId,
        model,
      });
      return json({ error: message, generationId: generation.id }, 400);
    }
    return json({ error: message, generationId: generation.id }, 502);
  }

  /*
   * The task id closes the loop: it is what the callback and the poller look
   * the row up by. Written under the service role because the row is only
   * insertable by its owner, not updatable.
   */
  const { error: dispatchError } = await admin
    .from("video_generations")
    .update({ status: "generating", provider_task_id: taskId })
    .eq("id", generation.id);

  if (dispatchError) {
    // The render is running and we cannot follow it, so it can only be settled
    // as failed. Refunding is the right side to err on: we cannot show a
    // result we have lost the handle to.
    log("error", "could not record the dispatched task", { traceId, taskId });
    await abandonRun(admin, generation.id, "Could not follow this render");
    return json({ error: "Could not record the generation", generationId: generation.id }, 500);
  }

  log("info", "generation submitted", { traceId, taskId, generationId: generation.id });
  return json({ generationId: generation.id, taskId });
});
