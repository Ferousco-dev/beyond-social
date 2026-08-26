import { DelayedError, UnrecoverableError, Worker, type Job } from "bullmq";

import { PermanentPublishError } from "../lib/platforms";
import { publishPost } from "../lib/publish";
import { createRedis } from "../lib/redis";
import { createServiceClient } from "../lib/supabase";
import { logger } from "../lib/logger";
import { PUBLISH_QUEUE, type PublishJobData } from "../queues/publishing";
import { reportPublishFailure } from "./publish-failure";

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
        /*
         * Delayed rather than failed: this is not an error, it is a turn taken
         * by somebody else. The wait is short because slots free constantly.
         *
         * `moveToDelayed` only changes the job's state in Redis; it does not
         * stop this function from returning normally afterwards, and a normal
         * return is what BullMQ reads as "completed". Throwing `DelayedError`
         * right after is how the worker itself is told not to do that: it is
         * caught internally and never reaches `worker.on("failed", ...)`,
         * which is what kept this from ever showing up as a real failure while
         * still leaving the job in the wrong state underneath.
         */
        await job.moveToDelayed(Date.now() + 5_000, job.token);
        logger.debug("deferred for fairness", { userId, running });
        throw new DelayedError();
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

        /*
         * The platforms fetch the video themselves: TikTok, Instagram and
         * Facebook are all given a URL to pull from. The renders bucket is
         * private, so a signed link is minted here rather than reading the
         * stored one, which no longer resolves.
         *
         * Signed for a day. The pull is asynchronous and queued on their side,
         * and a link that expires before they get to it fails the post after
         * the render has already been paid for. A day is far longer than any
         * platform takes and still bounded.
         */
        const PULL_URL_TTL_SECONDS = 24 * 60 * 60;

        let videoUrl: string | null = null;
        if (post.generation_id) {
          const { data, error: lookupError } = await supabase
            .from("video_generations")
            .select("result_path")
            .eq("id", post.generation_id)
            .single();

          /*
           * A read that failed is not the same fact as a row with nothing in
           * it, and treating them the same used to send both down the same
           * path: `videoUrl` stayed null either way, which `publishPost` reads
           * as "this post genuinely has no video" and refuses permanently.
           * A transient read here would have failed the post for good on a
           * reason that was never true. Thrown plainly, not as
           * `PermanentPublishError`, so it retries like any other transient
           * failure instead of ending the job on the spot.
           */
          if (lookupError)
            throw new Error(`could not read the render for this post: ${lookupError.message}`);

          const path = (data?.result_path as string | null) ?? null;
          if (path) {
            const { data: signed } = await supabase.storage
              .from("renders")
              .createSignedUrl(path, PULL_URL_TTL_SECONDS);
            videoUrl = signed?.signedUrl ?? null;
          }
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

        const { error: settleError } = await supabase
          .from("scheduled_posts")
          .update({ status: "published", external_id: externalId, error: null })
          .eq("id", scheduledPostId);

        /*
         * The platform has already accepted the post at this point, so this is
         * not a failure to retry: throwing here would let BullMQ run the job
         * again, and a second `publishPost` call would post a second time to a
         * real account. Logged loudly instead, since a row stuck without its
         * `external_id` recorded is exactly what `claim_post_for_publish` and
         * the admin stuck-post scan both rely on never happening.
         */
        if (settleError) {
          logger.error("could not record a successful publish", {
            scheduledPostId,
            platform: post.platform,
            externalId,
            error: settleError.message,
          });
          return;
        }

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
    void reportPublishFailure(supabase, job, error);
  });

  return worker;
}
