import { UnrecoverableError, type Job } from "bullmq";

import { logger } from "../lib/logger";
import { traceIdForScheduledPost } from "../lib/scheduled-posts";
import type { createServiceClient } from "../lib/supabase";
import type { PublishJobData } from "../queues/publishing";

/**
 * Turns one BullMQ failure into a trace-carrying log line, and persists a
 * terminal failure to the row so the user sees it.
 *
 * This is the line the ARCHITECTURE.md gap was about: the success path
 * already got the trace id for free off `claim_post_for_publish`, but a
 * failure is the case somebody actually goes looking for, and this is where
 * every attempt, retried or not, ends up.
 */
export async function reportPublishFailure(
  supabase: ReturnType<typeof createServiceClient>,
  job: Job<PublishJobData> | undefined,
  error: Error,
): Promise<void> {
  const traceId = job ? await traceIdForScheduledPost(supabase, job.data.scheduledPostId) : null;

  logger.warn("publish job failed", {
    jobId: job?.id,
    scheduledPostId: job?.data.scheduledPostId,
    attempts: job?.attemptsMade,
    error: error.message,
    traceId,
  });

  /*
   * A revoked token or a rejected video will not succeed on the fifth attempt
   * either. `attemptsMade >= attempts` alone misses the case above throws as
   * `UnrecoverableError` specifically to skip retries: BullMQ honours that by
   * failing the job on its first attempt regardless of how many are
   * configured, which left every genuinely permanent failure sitting at
   * `status = 'publishing'` forever, no error on the row, nothing for the
   * user to see.
   */
  const attempts = job?.opts.attempts ?? 1;
  const permanent = job && (job.attemptsMade >= attempts || error instanceof UnrecoverableError);
  if (permanent) {
    await supabase
      .from("scheduled_posts")
      .update({ status: "failed", error: error.message })
      .eq("id", job.data.scheduledPostId);
  }
}
