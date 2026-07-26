import { NextResponse } from "next/server";

import { isCronAuthorised } from "@/lib/cron/auth";
import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { isSupabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Bounds the shared caches.
 *
 * An unbounded cache is a slowly growing storage bill that nobody notices until
 * it is large. Expired completions go first, then the least recently used
 * embeddings once the table passes its ceiling.
 */
export const dynamic = "force-dynamic";

export const GET = withTrace("GET /api/cron/prune-caches", async (request) => {
  if (!isCronAuthorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured || serverEnv.SUPABASE_SERVICE_ROLE_KEY === "") {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }

  const { data, error } = await createServiceClient().rpc("cache_prune", {});
  if (error) {
    logger.error("cache prune failed", { error: error.message });
    return NextResponse.json({ error: "prune_failed" }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  logger.info("cache prune run", { ...(row ?? {}) });
  return NextResponse.json({ ok: true, ...(row ?? {}) });
});
