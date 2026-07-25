import "dotenv/config";

import { env, isQueueConfigured } from "./config/env";
import { createHealthServer } from "./lib/health-server";
import { logger } from "./lib/logger";
import { startPublishWorker } from "./processors/publish-post";
import { createPublishQueue } from "./queues/publishing";
import { startScheduler } from "./scheduler";

function main(): void {
  logger.info("Starting Beyond Social worker", {
    environment: env.NODE_ENV,
    queue: isQueueConfigured,
  });

  const healthServer = createHealthServer(env.WORKER_PORT);
  const disposers: Array<() => Promise<void> | void> = [];

  if (isQueueConfigured) {
    const queue = createPublishQueue();
    const worker = startPublishWorker();
    const stopScheduler = startScheduler(queue);
    disposers.push(
      stopScheduler,
      () => worker.close(),
      () => queue.close(),
    );
    logger.info("Publishing queue started");
  } else {
    logger.warn("Queue disabled; set REDIS_URL and Supabase service credentials to enable it");
  }

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info("Received shutdown signal, closing worker", { signal });
    void Promise.allSettled(disposers.map((dispose) => dispose())).finally(() => {
      healthServer.close(() => {
        logger.info("Worker shut down cleanly");
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
