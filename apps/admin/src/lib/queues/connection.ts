import "server-only";

import { Queue, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";

import { PUBLISH_QUEUE, QUEUE_LIMITS } from "./config";
import { redisUrl } from "./env";
import { type publishJobDataSchema } from "./schemas";
import { type QueueResult } from "./types";

import type { z } from "zod";

export type PublishQueue = Queue<z.infer<typeof publishJobDataSchema>>;

/**
 * Rejects when a promise misses the budget, so nothing here can outlive one
 * page render. ioredis has its own timeouts, but they do not cover the case
 * where a connection is established and then simply stops answering.
 */
async function withDeadline<TValue>(work: Promise<TValue>, ms: number): Promise<TValue> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Redis did not answer in ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Opens a short-lived connection to the publishing queue, runs one unit of
 * work, and always tears the connection down.
 *
 * A connection per operation rather than a pooled one: the console reads the
 * queue a handful of times an hour, and a module-level client would keep a
 * socket open, reconnect forever in the background, and turn a Redis outage
 * into console log noise on every deployed instance.
 *
 * The connection is deliberately unforgiving. `retryStrategy` returns null so a
 * dead Redis fails on the first attempt instead of retrying inside the render,
 * and `enableOfflineQueue` is false so commands issued while the socket is down
 * reject rather than buffer until a timeout the caller never set.
 */
export async function withPublishQueue<TValue>(
  work: (queue: PublishQueue) => Promise<TValue>,
): Promise<QueueResult<TValue>> {
  const url = redisUrl();
  if (url === null) return { ok: false, reason: "not-configured" };

  const connection = new Redis(url, {
    maxRetriesPerRequest: null, // Required by BullMQ.
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: QUEUE_LIMITS.connectTimeoutMs,
    commandTimeout: QUEUE_LIMITS.commandTimeoutMs,
    retryStrategy: () => null,
  });

  // ioredis emits 'error' on an EventEmitter with no other listener, which in
  // Node terminates the process. The failure is handled by the catch below.
  connection.on("error", () => {});

  let queue: PublishQueue | undefined;
  try {
    return await withDeadline(
      (async () => {
        await connection.connect();
        // The cast bridges a pnpm version split between ioredis and the copy
        // bullmq resolves; the instance is runtime-compatible. Same pattern as
        // apps/worker/src/lib/redis.ts.
        queue = new Queue(PUBLISH_QUEUE, {
          connection: connection as unknown as ConnectionOptions,
        });
        return { ok: true as const, value: await work(queue) };
      })(),
      QUEUE_LIMITS.deadlineMs,
    );
  } catch {
    // Every reason the queue could not be read collapses here on purpose. The
    // page has one honest thing to say either way: it does not know.
    return { ok: false, reason: "unreachable" };
  } finally {
    await queue?.close().catch(() => {});
    connection.disconnect();
  }
}
