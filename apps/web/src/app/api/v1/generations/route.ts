import { NextResponse } from "next/server";
import { z } from "zod";

import { guardApiRequest } from "@/lib/api/guard";
import { listGenerations } from "@/lib/api/resources";
import { isFlagEnabled } from "@/lib/flags";
import { withTrace } from "@/lib/observability/http";
import { currentTrace } from "@/lib/observability/trace";

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

  const guarded = await guardApiRequest(request);
  if (!guarded.ok) return guarded.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ limit: url.searchParams.get("limit") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: "limit must be between 1 and 100." },
      { status: 400 },
    );
  }

  const rows = await listGenerations(guarded.caller.userId, parsed.data.limit);
  if (rows === null) {
    // The trace id is returned so a caller reporting a failure gives us the
    // exact log line rather than a timestamp to search around.
    return NextResponse.json(
      { error: "server_error", trace_id: currentTrace()?.traceId },
      { status: 500 },
    );
  }

  return NextResponse.json({ object: "list", data: rows });
});
