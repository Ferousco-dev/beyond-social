"use server";

import { logger } from "@/lib/logger";
import { sharedRateLimit } from "@/lib/rate-limit-shared";
import { isSupabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { edgeFunctionErrorMessage } from "@/lib/supabase/function-error";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The self-service half of HeyGen polling: "check now" for one person's own
 * rows.
 *
 * The schedules (Supabase Cron every few minutes, Vercel cron as fallback)
 * poll everybody's pending rows in bounded batches. That is the mechanism that
 * moves avatars and videos forward, and this action does not replace it: it
 * only lets somebody staring at a spinner ask for their own rows to be looked
 * at ahead of the next tick, rather than waiting for it.
 *
 * Scoped before it runs. The caller's pending rows are read first under their
 * own session, and the pollers are only invoked when at least one exists, so
 * a tap with nothing waiting costs two indexed reads and zero provider calls.
 * The pollers themselves still walk the shared bounded batch, oldest first,
 * which is what makes one person's tap occasionally finish somebody else's
 * row too rather than something worth preventing.
 */

export type CheckNowResult =
  | { status: "ok"; trainingChecked: number; videosChecked: number }
  | { status: "idle"; message: string }
  | { status: "throttled"; retryAfterMs: number; message: string }
  | { status: "error"; message: string };

/** A tap is cheap but each one can spend provider quota, so taps are budgeted. */
const CHECK_LIMIT = 5;
const CHECK_WINDOW_MS = 5 * 60 * 1000;

interface PollCounts {
  checked: number;
}

export async function checkTwinNow(): Promise<CheckNowResult> {
  if (!isSupabaseConfigured || serverEnv.CRON_SECRET === "") {
    return { status: "error", message: "Status checks are not configured right now" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to check your avatar" };

  const limited = await sharedRateLimit(
    `heygen-check-now:${user.id}`,
    CHECK_LIMIT,
    CHECK_WINDOW_MS,
  );
  if (!limited.ok) {
    return {
      status: "throttled",
      retryAfterMs: limited.retryAfterMs,
      message: "Checks are coming through as fast as they can. Try again in a minute.",
    };
  }

  const [avatars, videos] = await Promise.all([
    supabase
      .from("heygen_avatars")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("training_status", "pending"),
    supabase
      .from("video_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("provider", "heygen")
      .eq("status", "generating"),
  ]);

  if ((avatars.count ?? 0) === 0 && (videos.count ?? 0) === 0) {
    return { status: "idle", message: "Nothing is waiting on HeyGen right now" };
  }

  // Same invocation the cron route makes: the provider key lives in the edge
  // function, and this action has no business seeing it either.
  const service = createServiceClient();
  let trainingChecked = 0;
  let videosChecked = 0;
  for (const job of ["poll-heygen-training", "poll-heygen-videos"] as const) {
    const { data, error } = await service.functions.invoke(job, {
      body: {},
      headers: { "x-cron-secret": serverEnv.CRON_SECRET },
    });
    if (error) {
      const detail = await edgeFunctionErrorMessage(error);
      logger.warn("check-now poll failed", { job, error: detail ?? error.message });
      return { status: "error", message: "That check did not reach HeyGen. Try again shortly." };
    }
    const counts = data as PollCounts;
    if (job === "poll-heygen-training") trainingChecked = counts.checked;
    else videosChecked = counts.checked;
  }

  logger.info("check-now polled heygen", { userId: user.id, trainingChecked, videosChecked });
  return { status: "ok", trainingChecked, videosChecked };
}
