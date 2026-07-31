import { parseEnv } from "@beyond-social/env";
import { z } from "zod";

const mailEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  MAIL_PORT: z.coerce.number().int().positive().default(9200),
  // Empty defaults so the service boots (health only) before infra is wired.
  REDIS_URL: z.string().url().or(z.literal("")).default(""),
  SUPABASE_URL: z.string().url().or(z.literal("")).default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  // No credentials exist yet. The provider fails closed on an empty key rather
  // than defaulting to a no-op that would report deliveries as sent.
  MAIL_PROVIDER_API_KEY: z.string().default(""),
  MAIL_FROM: z.string().email().or(z.literal("")).default(""),
});

export type MailEnv = z.infer<typeof mailEnvSchema>;

export const env: MailEnv = parseEnv(mailEnvSchema, process.env);

// The mail queue only runs when Redis and the Supabase service role exist.
export const isQueueConfigured =
  env.REDIS_URL !== "" && env.SUPABASE_URL !== "" && env.SUPABASE_SERVICE_ROLE_KEY !== "";
