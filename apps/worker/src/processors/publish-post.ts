import { Worker, type Job } from "bullmq";

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
      const { scheduledPostId, platform, caption, hashtags, generationId } = job.data;

      let videoUrl: string | null = null;
      if (generationId) {
        const { data } = await supabase
          .from("video_generations")
          .select("result_url")
          .eq("id", generationId)
          .single();
        videoUrl = (data?.result_url as string | null) ?? null;
      }

      const { externalId } = await publishPost({ platform, caption, hashtags, videoUrl });

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
