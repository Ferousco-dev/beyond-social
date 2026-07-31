import { Queue } from "bullmq";

import { createRedis } from "../lib/redis";

export const MAIL_QUEUE = "send-mail";

export interface MailJobData {
  /** The mail_deliveries row this job sends. The row, not the job, is the truth. */
  deliveryId: string;
}

export function createMailQueue() {
  return new Queue<MailJobData>(MAIL_QUEUE, {
    connection: createRedis(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
}

export type MailQueue = ReturnType<typeof createMailQueue>;
