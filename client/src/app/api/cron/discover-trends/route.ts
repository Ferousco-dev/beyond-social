import { NextResponse } from "next/server";

import { isCronAuthorised } from "@/lib/cron/auth";
import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { discoverTrends } from "@/lib/trends/discover";

/**
 * Trend discovery, on demand.
 *
 * No longer scheduled. The written feed it fills is parked behind
 * `/dashboard/trends/feed` while the TikTok scroller takes its place, and a
 * nightly sweep that scrapes and runs an extraction pass for a page nobody is
 * sent to is money spent on nothing. The route stays so the feed can be
 * refilled by hand if it comes back.
 *
 * Still requires the configured secret as a bearer token: an unauthenticated
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
