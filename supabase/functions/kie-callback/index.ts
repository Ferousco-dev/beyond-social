// Public webhook that kie.ai calls when a generation finishes. It is not
// JWT-protected (kie.ai cannot send a Supabase JWT), so it is guarded by a
// shared secret in the query string and uses the service role to finalize
// the generation and charge the credit atomically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/http.ts";
import { parseUrls } from "../_shared/kie.ts";
import { persistRender } from "../_shared/store.ts";

interface CallbackBody {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    info?: { resultUrls?: unknown };
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const expected = Deno.env.get("KIE_CALLBACK_SECRET") ?? "";
  if (!expected || url.searchParams.get("token") !== expected) {
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

  const urls = parseUrls(body.data?.info?.resultUrls);
  if (body.code === 200 && urls.length > 0) {
    const { data: generation } = await admin
      .from("video_generations")
      .select("user_id")
      .eq("provider_task_id", taskId)
      .single();
    const resultUrl = generation
      ? await persistRender(admin, generation.user_id, taskId, urls[0])
      : urls[0];
    await admin.rpc("complete_generation", { p_provider_task_id: taskId, p_result_url: resultUrl });
  } else {
    await admin.rpc("fail_generation", {
      p_provider_task_id: taskId,
      p_error: body.msg ?? "Generation failed",
    });
  }

  return json({ received: true });
});
