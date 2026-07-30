import { UnrecoverableError, Worker, type Job } from "bullmq";

import { PermanentPublishError } from "../lib/platforms";
import { publishPost } from "../lib/publish";
import { createRedis } from "../lib/redis";
import { createServiceClient } from "../lib/supabase";
import { logger } from "../lib/logger";
import { PUBLISH_QUEUE, type PublishJobData } from "../queues/publishing";

/**
 * Publishes one scheduled post.
 *
 * The property that matters: running this twice must not post twice. BullMQ
 * retries five times, and a socket that dies after the platform accepted the
 * video is indistinguishable from one that died before it. Without a guard, a
 * transient network error becomes a duplicate post on someone's public account,
 * which is not a state we can undo for them.
 *
 * The guard is a claim in the database rather than a check in this process. The
 * row is transitioned and read in one statement, so two workers racing for the
 * same job cannot both proceed, and a row already carrying an external id is
 * never claimed at all.
 */

/**
 * How many publishes run at once.
 *
 * Raised from five, which was a queue-wide ceiling: one person scheduling fifty
 * posts held everyone else behind them. Throughput is bounded by the platforms
 * rather than by us, so the fairness cap below matters more than this number.
 */
const CONCURRENCY = 20;

/** No single account may hold more than this many slots at once. */
const MAX_IN_FLIGHT_PER_USER = 3;

interface PublishClaim {
  id: string;
  user_id: string;
  platform: string;
  caption: string;
  hashtags: string;
  generation_id: string | null;
  trace_id: string | null;
}

export function startPublishWorker(): Worker<PublishJobData> {
  const supabase = createServiceClient();

  /*
   * Head-of-line fairness.
   *
   * BullMQ processes one FIFO queue, so a single account scheduling a hundred
   * posts at noon occupies every slot and everyone else waits behind it.
   * Counting in-flight work per user and deferring past the cap stops one heavy
   * account becoming everybody's outage.
   */
  const inFlight = new Map<string, number>();

  const worker = new Worker<PublishJobData>(
    PUBLISH_QUEUE,
    async (job: Job<PublishJobData>) => {
      const { scheduledPostId, userId } = job.data;

      const running = inFlight.get(userId) ?? 0;
      if (running >= MAX_IN_FLIGHT_PER_USER) {
        // Delayed rather than failed: this is not an error, it is a turn taken
        // by somebody else. The wait is short because slots free constantly.
        await job.moveToDelayed(Date.now() + 5_000, job.token);
        logger.debug("deferred for fairness", { userId, running });
        return;
      }
      inFlight.set(userId, running + 1);

      try {
        const { data: claimed, error: claimError } = await supabase.rpc("claim_post_for_publish", {
          p_post: scheduledPostId,
        });
        if (claimError) throw new Error(claimError.message);

        const post = (claimed as PublishClaim[] | null)?.[0];
        if (!post) {
          // The row already has an external id, so a previous attempt reached
          // the platform. Doing nothing is the entire point.
          logger.info("publish skipped, already handled", { scheduledPostId, jobId: job.id });
          return;
        }

        let videoUrl: string | null = null;
        if (post.generation_id) {
          const { data } = await supabase
            .from("video_generations")
            .select("result_url")
            .eq("id", post.generation_id)
            .single();
          videoUrl = (data?.result_url as string | null) ?? null;
        }

        let externalId: string;
        try {
          ({ externalId } = await publishPost({
            userId: post.user_id,
            platform: post.platform,
            caption: post.caption,
            hashtags: post.hashtags,
            videoUrl,
          }));
        } catch (error) {
          // A revoked token or a rejected video will not succeed on the fifth
          // attempt either. Retrying only delays telling the user something is
          // wrong, so these end the job immediately.
          if (error instanceof PermanentPublishError) {
            throw new UnrecoverableError(error.message);
          }
          throw error;
        }

        await supabase
          .from("scheduled_posts")
          .update({ status: "published", external_id: externalId, error: null })
          .eq("id", scheduledPostId);

        // Carries the trace of the request that scheduled this, which is the
        // only thing connecting a post going out now to the person who asked for
        // it days ago.
        logger.info("published", {
          scheduledPostId,
          platform: post.platform,
          traceId: post.trace_id,
        });
      } finally {
        const remaining = (inFlight.get(userId) ?? 1) - 1;
        if (remaining <= 0) inFlight.delete(userId);
        else inFlight.set(userId, remaining);
      }
    },
    { connection: createRedis(), concurrency: CONCURRENCY },
  );

  worker.on("failed", (job, error) => {
    logger.warn("publish job failed", {
      jobId: job?.id,
      attempts: job?.attemptsMade,
      error: error.message,
    });
    const attempts = job?.opts.attempts ?? 1;
    if (job && job.attemptsMade >= attempts) {
      void supabase
        .from("scheduled_posts")
        .update({ status: "failed", error: error.message })
        .eq("id", job.data.scheduledPostId);
    }
  });

  return worker;
}
