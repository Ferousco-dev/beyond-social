import { NextResponse } from "next/server";

import { isCronAuthorised } from "@/lib/cron/auth";
import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { discoverTrends } from "@/lib/trends/discover";

/**
 * Scheduled trend discovery.
 *
 * Triggered by Vercel Cron, which sends the configured secret as a bearer
 * token. The secret is required rather than optional: an unauthenticated
 * endpoint that runs a scraping sweep is a way for anyone to spend our money.
 */
export const dynamic = "force-dynamic";
/** Discovery walks every category, so it needs more than the default budget. */
export const maxDuration = 300;

export const GET = withTrace("GET /api/cron/discover-trends", async (request) => {
  if (!isCronAuthorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await discoverTrends();
  logger.info("trend discovery run", { ...result });

  // A failed run returns 500 so the cron dashboard shows it as failed rather
  // than a green tick over an empty feed.
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
});
