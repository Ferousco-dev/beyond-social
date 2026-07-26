import { UnrecoverableError, Worker, type Job } from "bullmq";

import { PermanentPublishError } from "../lib/platforms";
import { publishPost } from "../lib/publish";
import { createRedis } from "../lib/redis";
import { createServiceClient } from "../lib/supabase";
import { logger } from "../lib/logger";
import { PUBLISH_QUEUE, type PublishJobData } from "../queues/publishing";

// Publishes one scheduled post. BullMQ retries with backoff; on the final
// attempt the post is marked failed so it never gets stuck in "publishing".
export function startPublishWorker(): Worker<PublishJobData> {
  const supabase = createServiceClient();

  const worker = new Worker<PublishJobData>(
    PUBLISH_QUEUE,
    async (job: Job<PublishJobData>) => {
      const { scheduledPostId, userId, platform, caption, hashtags, generationId } = job.data;

      let videoUrl: string | null = null;
      if (generationId) {
        const { data } = await supabase
          .from("video_generations")
          .select("result_url")
          .eq("id", generationId)
          .single();
        videoUrl = (data?.result_url as string | null) ?? null;
      }

      let externalId: string;
      try {
        ({ externalId } = await publishPost({
          userId,
          platform,
          caption,
          hashtags,
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
    },
    { connection: createRedis(), concurrency: 5 },
  );

  worker.on("completed", (job) => logger.info("publish job completed", { jobId: job.id }));
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
