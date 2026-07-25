import "server-only";

import { parseEnv } from "@beyond-social/env";
import { z } from "zod";

/**
 * Server-only secrets. These never reach the browser bundle (guarded by the
 * `server-only` import). Everything defaults to empty so the app builds and runs
 * before the integrations exist; guard usage with the `is*Configured` flags.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  VOYAGE_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  ANTHROPIC_API_KEY: z.string().default(""),
});

export const serverEnv = parseEnv(serverEnvSchema, {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
});

/**
 * The prompt engine can run only with an embedder, a generator, and a
 * service-role connection to the pgvector store. Without all three we skip
 * enhancement and generate from the raw prompt.
 */
export const isPromptEngineConfigured =
  serverEnv.SUPABASE_SERVICE_ROLE_KEY !== "" &&
  serverEnv.ANTHROPIC_API_KEY !== "" &&
  (serverEnv.VOYAGE_API_KEY !== "" || serverEnv.OPENAI_API_KEY !== "");
