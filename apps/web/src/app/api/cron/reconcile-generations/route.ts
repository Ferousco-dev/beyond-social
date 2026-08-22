import { NextResponse } from "next/server";

import { isCronAuthorised } from "@/lib/cron/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { serverEnv } from "@/lib/server-env";
import { edgeFunctionErrorMessage } from "@/lib/supabase/function-error";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Reconciliation for generations stuck at "generating".
 *
 * `kie-callback` and the client's own poll are the two paths a generation
 * settles through; both can miss (a lost webhook, a closed tab), leaving a
 * row stuck forever with its credit already held. Nothing else touches
 * `video_generations` on a schedule: the retention cron explicitly excludes
 * it ("Messages and generations are never touched"), because that job is
 * about deletion and this one is not.
 *
 * The actual sweep lives in the `reconcile-generations` edge function
 * alongside the rest of the generation domain logic (the RPCs and webhook
 * delivery it reuses are Supabase-side already), so this route is a thin,
 * authenticated trigger, same shape as `/api/cron/retention`.
 *
 * DRY RUN BY DEFAULT, for the same reason retention is: force-failing a row
 * refunds a real credit, so the first accidental call or misconfigured
 * schedule should report what it would do rather than do it.
 */
export const dynamic = "force-dynamic";

interface ReconcileResult {
  applied: boolean;
  thresholdMinutes: number;
  candidates: number;
  failed: number;
}

export const GET = withTrace("GET /api/cron/reconcile-generations", async (request) => {
  if (!isCronAuthorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured || serverEnv.SUPABASE_SERVICE_ROLE_KEY === "") {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  const apply = new URL(request.url).searchParams.get("apply") === "1";

  // The service client's own key rides along as the Authorization header on
  // this call, which is what the edge function checks: there is no end user
  // here to hold a JWT, so the shared secret both sides already have stands
  // in for one, the same way `kie-callback` uses a secret in place of a JWT
  // it has no way to receive.
  const { data, error } = await createServiceClient().functions.invoke("reconcile-generations", {
    body: { apply },
  });

  if (error) {
    // The edge function's actual reason, when the failure was an HTTP
    // response and not a fetch that never reached it.
    const detail = await edgeFunctionErrorMessage(error);
    logger.error("reconcile-generations failed", { error: detail ?? error.message });
    return NextResponse.json({ error: "reconcile_failed" }, { status: 500 });
  }

  const result = data as ReconcileResult;
  logger.info(apply ? "generation reconciliation applied" : "generation reconciliation dry run", {
    ...result,
  });
  return NextResponse.json({ ok: true, ...result });
});
