import "dotenv/config";

import { env, isQueueConfigured } from "./config/env";
import { createHealthServer } from "./lib/health-server";
import { logger } from "./lib/logger";
import { startMailWorker } from "./processors/send-mail";

function main(): void {
  logger.info("Starting Beyond Social mail service", {
    environment: env.NODE_ENV,
    queue: isQueueConfigured,
  });

  const healthServer = createHealthServer(env.MAIL_PORT);
  const disposers: Array<() => Promise<void> | void> = [];

  if (isQueueConfigured) {
    const worker = startMailWorker();
    disposers.push(() => worker.close());
    logger.info("Mail queue started");
  } else {
    logger.warn("Queue disabled; set REDIS_URL and Supabase service credentials to enable it");
  }

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info("Received shutdown signal, closing mail service", { signal });
    void Promise.allSettled(disposers.map((dispose) => dispose())).finally(() => {
      healthServer.close(() => {
        logger.info("Mail service shut down cleanly");
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
