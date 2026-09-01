// Public webhook that kie.ai calls when a generation finishes. It is not
// JWT-protected (kie.ai cannot send a Supabase JWT), so it is guarded by a
// shared secret in the query string and uses the service role to finalize
// the generation and charge the credit atomically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { json, serve } from "../_shared/http.ts";
import { parseUrls } from "../_shared/kie.ts";
import { timingSafeEqual } from "../_shared/security.ts";
import { persistRender } from "../_shared/store.ts";
import { deliverEvent } from "../_shared/webhooks.ts";
import { log } from "../_shared/trace.ts";

interface CallbackBody {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    info?: { resultUrls?: unknown };
  };
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const expected = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  const provided = url.searchParams.get("token") ?? "";
  if (!expected || !timingSafeEqual(provided, expected)) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: CallbackBody;
  try {
    body = (await req.json()) as CallbackBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const taskId = body.data?.taskId;
  if (!taskId) return json({ error: "Missing taskId" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Read once, before branching: the trace id belongs on both the success and
  // the failure line, and a failure is the case somebody will actually be
  // searching for.
  const { data: generation } = await admin
    .from("video_generations")
    .select("id, user_id, trace_id")
    .eq("provider_task_id", taskId)
    .single();
  const traceId = generation?.trace_id ?? null;

  const urls = parseUrls(body.data?.info?.resultUrls);
  if (body.code === 200 && urls.length > 0) {
    const resultUrl = generation
      ? await persistRender(admin, generation.user_id, taskId, urls[0])
      : urls[0];
    const { error } = await admin.rpc("complete_generation", {
      p_provider_task_id: taskId,
      p_result_url: resultUrl,
    });
    if (error) {
      // supabase-js does not throw on an RPC error, it returns it here. Miss
      // this and the row is stuck at "generating" with its credit already
      // spent, and kie.ai believes the callback succeeded because we answer
      // 200 either way. A 5xx is the one signal that tells kie.ai to retry.
      log("error", "complete_generation failed", {
        traceId,
        taskId,
        generationId: generation?.id,
        reason: error.message,
      });
      return json({ error: "Could not complete the generation" }, 500);
    }
    log("info", "generation completed", { traceId, taskId });
    if (generation) {
      await deliverEvent(
        admin,
        generation.user_id,
        "generation.completed",
        {
          generation_id: generation.id,
          // The signed link, not the storage path: a receiver can fetch this, and
          // it expires, which is the same contract the REST API gives.
          result_url: resultUrl,
        },
        traceId,
      );
    }
  } else {
    const reason = body.msg ?? "Generation failed";
    const { error } = await admin.rpc("fail_generation", {
      p_provider_task_id: taskId,
      p_error: reason,
    });
    if (error) {
      log("error", "fail_generation failed", {
        traceId,
        taskId,
        generationId: generation?.id,
        reason: error.message,
      });
      return json({ error: "Could not record the generation failure" }, 500);
    }
    log("warn", "generation failed", { traceId, taskId, code: body.code, reason });
    if (generation) {
      await deliverEvent(
        admin,
        generation.user_id,
        "generation.failed",
        {
          generation_id: generation.id,
          error: reason,
        },
        traceId,
      );
    }
  }

  return json({ received: true });
});
