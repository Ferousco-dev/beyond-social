import "dotenv/config";

import { env } from "./config/env";
import { createHealthServer } from "./lib/health-server";
import { logger } from "./lib/logger";

function main(): void {
  logger.info("Starting Beyond Social worker", { environment: env.NODE_ENV });

  const healthServer = createHealthServer(env.WORKER_PORT);

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info("Received shutdown signal, closing worker", { signal });
    healthServer.close(() => {
      logger.info("Worker shut down cleanly");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
