// Authenticated endpoint: syncs a single generation's status from kie.ai and
// returns it. Lets the app poll for results in local dev where the kie.ai
// webhook cannot reach the machine.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/http.ts";
import { getJobInfo, getRecordInfo } from "../_shared/kie.ts";
import { persistRender } from "../_shared/store.ts";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { generationId } = (await req.json().catch(() => ({}))) as { generationId?: string };
  if (!generationId) return json({ error: "generationId is required" }, 400);

  const { data: generation } = await supabase
    .from("video_generations")
    .select("id, status, provider_task_id, result_url, model")
    .eq("id", generationId)
    .single();
  if (!generation) return json({ error: "Not found" }, 404);

  // Terminal or not-yet-dispatched: nothing to sync.
  if (
    generation.status === "ready" ||
    generation.status === "failed" ||
    !generation.provider_task_id
  ) {
    return json({ status: generation.status, resultUrl: generation.result_url });
  }

  /*
   * Two providers' status endpoints behind one row.
   *
   * Veo tasks are created on `/veo/generate` and report through
   * `/veo/record-info`; market models such as the avatar are created on
   * `/jobs/createTask` and report through `/jobs/recordInfo`, with a different
   * response shape. Asking the wrong one about a task id returns nothing found,
   * which would read as a render that never finishes.
   *
   * The test is the `veo` prefix rather than "has a slash", which is what it
   * used to be. Most market ids are vendor-prefixed and do contain one, but
   * `omnihuman-1-5` does not, so it would have been polled against the veo
   * endpoint and never seen to finish. Inactive today, which is the only
   * reason that had not happened yet.
   */
  const isVeo = typeof generation.model === "string" && generation.model.startsWith("veo");
  const info = isVeo
    ? await getRecordInfo(generation.provider_task_id)
    : await getJobInfo(generation.provider_task_id);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  if (info.successFlag === 1 && info.resultUrls.length > 0) {
    const resultUrl = await persistRender(
      admin,
      user.id,
      generation.provider_task_id,
      info.resultUrls[0],
    );
    await admin.rpc("complete_generation", {
      p_provider_task_id: generation.provider_task_id,
      p_result_url: resultUrl,
    });
    return json({ status: "ready", resultUrl });
  }
  if (info.successFlag === 2 || info.successFlag === 3) {
    await admin.rpc("fail_generation", {
      p_provider_task_id: generation.provider_task_id,
      p_error: "Generation failed",
    });
    return json({ status: "failed", resultUrl: null });
  }

  return json({ status: "generating", resultUrl: null });
});
