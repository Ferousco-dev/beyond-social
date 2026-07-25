import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api/authenticate";
import { checkApiRateLimit } from "@/lib/api/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

/** Public API: rolled-up AI usage for the caller over the last 30 days. */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
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

  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const service = createServiceClient();
  const { data, error } = await service.rpc("ai_usage_summary", {
    p_user: caller.userId,
    p_since: since,
  });

  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ object: "usage", period_days: 30, data: row ?? null });
}
