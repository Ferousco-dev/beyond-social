import { NextResponse } from "next/server";

import { isCronAuthorised } from "@/lib/cron/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { serverEnv } from "@/lib/server-env";
import { edgeFunctionErrorMessage } from "@/lib/supabase/function-error";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The HeyGen side of the app, which nothing else asks about.
 *
 * HeyGen calls back for neither of the two things that take time: training a
 * twin, and rendering a video of one. Both edge functions were written to be
 * polled and neither had anything polling them, so a twin could finish training
 * and never be marked ready, and a video could finish and never reach its owner
 * while still holding their credits.
 *
 * One route for both because they are one schedule, one secret and one
 * provider. Splitting them would buy independent cadences nobody needs and
 * spend a second of the very small number of cron slots this project has.
 *
 * The functions are triggered, not implemented, here: they hold the provider
 * key, which a route on the app server has no business seeing. Same shape as
 * /api/cron/reconcile-generations.
 */
export const dynamic = "force-dynamic";

interface PollResult {
  checked: number;
  ready?: number;
  failed?: number;
  reason?: string;
}

const JOBS = ["poll-heygen-training", "poll-heygen-videos"] as const;

export const GET = withTrace("GET /api/cron/poll-heygen", async (request) => {
  if (!isCronAuthorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured || serverEnv.CRON_SECRET === "") {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  const client = createServiceClient();

  /*
   * The shared cron secret rides along as a header, which is what both
   * functions check: there is no end user here to hold a JWT, so the secret
   * both sides already have stands in for one.
   *
   * Run in sequence rather than together. Each walks a bounded batch of the
   * same provider's API, and firing both at once only makes the rate limit
   * arrive sooner.
   */
  const results: Record<string, PollResult> = {};
  for (const job of JOBS) {
    const { data, error } = await client.functions.invoke(job, {
      body: {},
      headers: { "x-cron-secret": serverEnv.CRON_SECRET },
    });

    if (error) {
      const detail = await edgeFunctionErrorMessage(error);
      logger.error("heygen poll failed", { job, error: detail ?? error.message });
      return NextResponse.json({ error: "poll_failed", job }, { status: 500 });
    }
    results[job] = data as PollResult;
  }

  logger.info("heygen polled", { ...results });
  return NextResponse.json({ ok: true, ...results });
});
