import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/api/authenticate";
import { checkApiRateLimit } from "@/lib/api/rate-limit";
import { isFlagEnabled } from "@/lib/flags";
import { withTrace } from "@/lib/observability/http";
import { currentTrace } from "@/lib/observability/trace";
import { signRenders } from "@/lib/generation/render-url";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Public API: list a caller's generations.
 *
 * Versioned under /api/v1 so the shape can change later without breaking
 * integrations. Authentication is by API key; there is no cookie path here, so
 * a browser session cannot be used to call it cross-site.
 */
export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = withTrace("GET /api/v1/generations", async (request) => {
  // Kill switch for the whole public API, so it can be taken down without a deploy.
  if (!(await isFlagEnabled("public_api", true))) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const caller = await authenticateRequest(request);
  if (!caller) {
    return NextResponse.json(
      { error: "unauthorized", message: "Provide a valid API key as a bearer token." },
      { status: 401 },
    );
  }

  // Throttled per key: an authenticated caller can still exhaust the database.
  const limit = checkApiRateLimit(caller.userId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Slow down." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ limit: url.searchParams.get("limit") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: "limit must be between 1 and 100." },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("video_generations")
    .select("id, prompt, status, result_url, result_path, aspect_ratio, created_at")
    .eq("user_id", caller.userId)
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);

  if (error) {
    // The trace id is returned so a caller reporting a failure gives us the
    // exact log line rather than a timestamp to search around.
    return NextResponse.json(
      { error: "server_error", trace_id: currentTrace()?.traceId },
      { status: 500 },
    );
  }

  /*
   * `result_url` is now minted per request rather than stored. The bucket that
   * holds finished videos is private, so the permanent public link the API used
   * to return no longer resolves. Callers see the same field with the same
   * meaning; it simply expires, which is stated in the docs.
   *
   * `result_path` is internal and stripped: it is a storage location, and
   * publishing it would invite callers to construct their own URLs against a
   * bucket whose access rules are ours to change.
   */
  const rows = (data ?? []) as { result_path: string | null }[];
  const signed = await signRenders(
    service,
    rows.map((row) => row.result_path),
  );

  return NextResponse.json({
    object: "list",
    data: rows.map(({ result_path, ...row }) => ({
      ...row,
      result_url: result_path ? (signed.get(result_path) ?? null) : null,
    })),
  });
});
