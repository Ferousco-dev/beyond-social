import { Queue } from "bullmq";

import { createRedis } from "../lib/redis";

export const PUBLISH_QUEUE = "publish-post";

export interface PublishJobData {
  scheduledPostId: string;
  platform: string;
  caption: string;
  hashtags: string;
  generationId: string | null;
}

export function createPublishQueue() {
  return new Queue<PublishJobData>(PUBLISH_QUEUE, {
    connection: createRedis(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
}

export type PublishQueue = ReturnType<typeof createPublishQueue>;
