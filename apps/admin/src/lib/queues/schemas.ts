import { z } from "zod";

/**
 * Contracts for everything that comes back from Redis.
 *
 * BullMQ's types describe the shape it intends to return, not the bytes that
 * are actually in Redis. The payloads were written by a different service, at a
 * possibly different version, and a hash field is a string until something
 * proves otherwise. So nothing reaches a component without passing through
 * here, and a payload that fails is reported as unknown rather than guessed.
 */

const count = z.number().int().nonnegative();

export const jobCountsSchema = z.object({
  waiting: count,
  active: count,
  delayed: count,
  failed: count,
  completed: count,
});

/** Mirrors PublishJobData in apps/worker/src/queues/publishing.ts. */
export const publishJobDataSchema = z.object({
  scheduledPostId: z.string().uuid(),
  userId: z.string().uuid(),
  platform: z.string().min(1),
  caption: z.string(),
  hashtags: z.string(),
  generationId: z.string().uuid().nullable(),
});

/** Redis stores every hash field as a string, epoch milliseconds included. */
export const epochMillisSchema = z.coerce.number().int().positive();

/**
 * Job ids as they may be addressed by an admin action.
 *
 * BullMQ ids are numeric by default but custom ids are permitted, so this
 * allows the safe subset rather than digits alone. It exists because the id
 * comes from a form post and is used to build a Redis key.
 */
export const jobIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9:_-]+$/, "Unrecognised job id");
