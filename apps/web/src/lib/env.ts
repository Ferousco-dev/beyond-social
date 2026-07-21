import { parseEnv } from "@beyond-social/env";
import { z } from "zod";

/**
 * Public, client-safe environment. Only NEXT_PUBLIC_* values belong here since
 * they are inlined into the browser bundle. Server-only secrets get their own
 * validated module once integrations are wired up.
 *
 * Supabase values default to empty so the app builds and the marketing site
 * runs before a Supabase project exists. Guard usage with `isSupabaseConfigured`.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().or(z.literal("")).default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
});

export const env = parseEnv(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const isSupabaseConfigured =
  env.NEXT_PUBLIC_SUPABASE_URL !== "" && env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "";
