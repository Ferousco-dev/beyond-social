// Authenticated endpoint: starts a kie.ai video generation for the signed-in
// user, after verifying they have credits, and records the task.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/http.ts";
import { createMarketVideoTask, createVideoTask } from "../_shared/kie.ts";
import { UnsupportedModelError } from "../_shared/kie-models.ts";
import { resolveDuration } from "../_shared/video-capabilities.ts";
import { handToProvider } from "../_shared/reference.ts";
import { log, traceIdFrom } from "../_shared/trace.ts";

/** The model used when the caller does not name one. */
const DEFAULT_MODEL = "veo3_fast";

interface GenerateBody {
  projectId?: string;
  prompt?: string;
  aspectRatio?: string;
  imageUrls?: string[];
  /** Object paths in the uploads bucket, preferred over imageUrls. */
  imagePaths?: string[];
  /** Which video model to run. Validated against the catalogue. */
  model?: string;
  /** Seconds. Only present when the request actually asked for a length. */
  duration?: number;
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

  // Enforce the credit quota before spending money on a generation.
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_total, credits_used")
    .eq("id", user.id)
    .single();
  if (profile && profile.credits_used >= profile.credits_total) {
    return json({ error: "No video credits remaining" }, 402);
  }

  const aspectRatio =
    body.aspectRatio === "16:9" || body.aspectRatio === "Auto" ? body.aspectRatio : "9:16";

  const callbackSecret = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  const callBackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kie-callback?token=${callbackSecret}`;

  /*
   * Reference images are handed to kie as bytes rather than as links to our
   * own storage.
   *
   * The bytes are read here through the service client, which talks to storage
   * over the platform's internal network, so this works regardless of whether
   * our storage is reachable from the public internet. That is the whole point:
   * passing a signed link meant kie had to fetch us, and in local development
   * that link is a 127.0.0.1 address pointing at kie's own loopback.
   *
   * Paths, not URLs, for the same reason the thread stores paths: a signed URL
   * is a fact that expires.
   */
  let referenceUrls: string[] | undefined;
  try {
    const paths = body.imagePaths?.slice(0, 2);
    if (paths && paths.length > 0) {
      referenceUrls = [];
      for (const path of paths) {
        referenceUrls.push(await handToProvider(supabase, "uploads", path, traceId));
      }
    } else {
      // Nothing was uploaded through the composer, so whatever the caller sent
      // is already a URL kie can reach.
      referenceUrls = body.imageUrls?.slice(0, 2);
    }
  } catch (error) {
    log("error", "could not hand the reference image to the provider", { traceId });
    return json(
      { error: error instanceof Error ? error.message : "Could not prepare the reference image" },
      502,
    );
  }

  /*
   * Which model, and therefore which endpoint.
   *
   * The requested id is looked up rather than trusted, and constrained to the
   * video family: naming an avatar model here would otherwise charge that
   * model's rate for a request shaped for a different endpoint. An inactive
   * row is refused, which is what keeps a half-built path from spending a
   * credit.
   */
  const requested = body.model ?? DEFAULT_MODEL;
  const { data: chosen } = await supabase
    .from("model_catalog")
    .select("id, is_active")
    .eq("id", requested)
    .eq("family", "video")
    .maybeSingle();
  if (!chosen?.is_active) return json({ error: "That model is not available" }, 503);

  /*
   * Length is a property of the model, so it can only be settled once the model
   * is known. This was previously fixed at Veo's `[4, 6, 8]` for the whole
   * catalogue, which capped every model at the cheapest one's ceiling: a Kling
   * run that could have been fifteen seconds came back as eight, and a request
   * for twelve fell back to eight rather than being honoured.
   */
  const duration = resolveDuration(chosen.id, body.duration);

  /*
   * Veo models are created on `/veo/generate`; every other model on this
   * provider is a market model on `/jobs/createTask`, with a different request
   * shape. The same split the poller makes when asking for status, and by the
   * same test, so a task can always be followed up on the endpoint that made
   * it.
   */
  const isVeo = chosen.id.startsWith("veo");

  let taskId: string;
  try {
    taskId = isVeo
      ? await createVideoTask({
          model: chosen.id,
          prompt,
          imageUrls: referenceUrls,
          aspectRatio,
          duration,
          callBackUrl,
        })
      : await createMarketVideoTask({
          model: chosen.id,
          prompt,
          imageUrls: referenceUrls ?? [],
          aspectRatio,
          duration,
          callBackUrl,
        });
  } catch (error) {
    /*
     * A model we cannot address correctly is refused before anything is
     * dispatched, so it is the caller's request that is wrong, not the
     * provider that is down. Reporting it as 502 would blame kie for a shape
     * this code chose.
     */
    if (error instanceof UnsupportedModelError) {
      log("error", "refused to dispatch a model with an unknown request shape", {
        traceId,
        model: chosen.id,
      });
      return json({ error: error.message }, 400);
    }
    return json({ error: error instanceof Error ? error.message : "Generation failed" }, 502);
  }

  const { data: generation, error: insertError } = await supabase
    .from("video_generations")
    .insert({
      project_id: body.projectId,
      user_id: user.id,
      prompt,
      aspect_ratio: aspectRatio,
      duration,
      image_urls: body.imageUrls ?? [],
      status: "generating",
      // Recorded so completion prices this against the model that actually ran,
      // and so polling knows which status endpoint to ask.
      model: chosen.id,
      provider_task_id: taskId,
      // Carried on the row because the callback arrives in a different process,
      // minutes later, where no header from the original request survives.
      trace_id: traceId,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    log("error", "could not record the generation", { traceId, taskId });
    return json({ error: "Could not record the generation" }, 500);
  }

  log("info", "generation submitted", { traceId, taskId, generationId: generation.id });
  return json({ generationId: generation.id, taskId });
});
