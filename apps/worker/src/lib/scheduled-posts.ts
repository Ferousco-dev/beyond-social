import type { createServiceClient } from "./supabase";

/**
 * The trace id recorded when this post was scheduled, or null when there is
 * none.
 *
 * Read back from the row rather than carried on the job: BullMQ hands the
 * same `job.data` to every retry, so nothing baked into it up front could
 * reflect anything learned later. This is the same asynchronous-gap problem
 * the generation callback solves by reading `trace_id` off the generation row
 * instead of trusting anything held in memory.
 */
export async function traceIdForScheduledPost(
  supabase: ReturnType<typeof createServiceClient>,
  scheduledPostId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("scheduled_posts")
    .select("trace_id")
    .eq("id", scheduledPostId)
    .maybeSingle();
  return (data as { trace_id: string | null } | null)?.trace_id ?? null;
}
