import { parseEnv } from "@beyond-social/env";
import { z } from "zod";

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  WORKER_PORT: z.coerce.number().int().positive().default(9100),
  // Empty defaults so the worker boots (health only) before infra is wired.
  REDIS_URL: z.string().url().or(z.literal("")).default(""),
  SUPABASE_URL: z.string().url().or(z.literal("")).default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  UPLOAD_POST_API_KEY: z.string().default(""),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export const env: WorkerEnv = parseEnv(workerEnvSchema, process.env);

// The publishing queue only runs when Redis and the Supabase service role exist.
export const isQueueConfigured =
  env.REDIS_URL !== "" && env.SUPABASE_URL !== "" && env.SUPABASE_SERVICE_ROLE_KEY !== "";
