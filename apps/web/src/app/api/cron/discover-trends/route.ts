import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { serverEnv } from "@/lib/server-env";
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

function authorised(request: Request): boolean {
  const expected = serverEnv.CRON_SECRET;
  // Fail closed: with no secret set, nobody can trigger it.
  if (expected === "") return false;

  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const GET = withTrace("GET /api/cron/discover-trends", async (request) => {
  if (!authorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await discoverTrends();
  logger.info("trend discovery run", { ...result });

  // A failed run returns 500 so the cron dashboard shows it as failed rather
  // than a green tick over an empty feed.
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
});
