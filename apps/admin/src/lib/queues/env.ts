import { z } from "zod";

/**
 * Redis is optional for the console in a way Supabase is not.
 *
 * The console's job here is to observe the queue, and an environment without a
 * queue is a legitimate state (a local checkout, a review deployment) rather
 * than a misconfiguration to crash on. So this returns null instead of throwing,
 * and the page renders "not configured" rather than a stack trace or a zero.
 */
const redisEnvSchema = z.object({
  REDIS_URL: z.string().url().or(z.literal("")).default(""),
});

export function redisUrl(): string | null {
  const parsed = redisEnvSchema.safeParse({ REDIS_URL: process.env.REDIS_URL });
  if (!parsed.success || parsed.data.REDIS_URL === "") return null;
  return parsed.data.REDIS_URL;
}
