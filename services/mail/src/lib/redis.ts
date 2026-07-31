import { type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";

import { env } from "../config/env";

// Returns an ioredis connection typed as BullMQ's ConnectionOptions. The cast
// bridges a pnpm ioredis version split between this service and bullmq's bundled
// copy; the instance is runtime-compatible. maxRetriesPerRequest: null is
// required by BullMQ.
export function createRedis(): ConnectionOptions {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  }) as unknown as ConnectionOptions;
}
