import { NextResponse } from "next/server";

import { guardApiRequest } from "@/lib/api/guard";
import { readUsage } from "@/lib/api/resources";
import { withTrace } from "@/lib/observability/http";
import { currentTrace } from "@/lib/observability/trace";

/** Public API: rolled-up AI usage for the caller over the last 30 days. */
export const dynamic = "force-dynamic";

const PERIOD_DAYS = 30;

export const GET = withTrace("GET /api/v1/usage", async (request) => {
  const guarded = await guardApiRequest(request);
  if (!guarded.ok) return guarded.response;

  const usage = await readUsage(guarded.caller.userId, PERIOD_DAYS);
  if (usage === null) {
    return NextResponse.json(
      { error: "server_error", trace_id: currentTrace()?.traceId },
      { status: 500 },
    );
  }

  return NextResponse.json({ object: "usage", period_days: PERIOD_DAYS, data: usage.usage });
});
