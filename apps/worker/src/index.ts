import "dotenv/config";

import { env, isQueueConfigured } from "./config/env";
import { createHealthServer } from "./lib/health-server";
import { logger } from "./lib/logger";
import { startPublishWorker } from "./processors/publish-post";
import { startRenderWorker } from "./processors/render-video";
import { createPublishQueue } from "./queues/publishing";
import { createRenderQueue } from "./queues/rendering";
import { startRenderScheduler, startScheduler } from "./scheduler";

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

    // Rendering runs on its own queue rather than sharing the publish one. The
    // work is CPU-bound where publishing waits on other people's APIs, so they
    // want different concurrency, and a backlog of exports must not hold up a
    // post that is due.
    const renderQueue = createRenderQueue();
    const renderWorker = startRenderWorker();
    const stopRenderScheduler = startRenderScheduler(renderQueue);

    disposers.push(
      stopScheduler,
      stopRenderScheduler,
      () => worker.close(),
      () => renderWorker.close(),
      () => queue.close(),
      () => renderQueue.close(),
    );
    logger.info("Publishing and rendering queues started");
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
