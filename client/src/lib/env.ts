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
  /*
   * Which social sign-in buttons to show, comma separated, e.g.
   * "google,github,facebook". Empty means password sign-in only.
   *
   * A list rather than a flag per provider so adding one is an environment
   * change and never a code change. Unknown names are ignored. See
   * `features/auth/providers.ts` for what Supabase Auth can actually complete.
   */
  NEXT_PUBLIC_AUTH_PROVIDERS: z.string().default(""),
  /**
   * Base URL of the Go API, e.g. https://api.example.com. Public on purpose: it
   * is an address, not a secret, and the browser opens the live-status socket
   * and the phone recorder talks to it directly. Every credential lives behind it.
   */
  NEXT_PUBLIC_API_URL: z.string().url().or(z.literal("")).default(""),
});

export const env = parseEnv(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_AUTH_PROVIDERS: process.env.NEXT_PUBLIC_AUTH_PROVIDERS,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

export const isSupabaseConfigured =
  env.NEXT_PUBLIC_SUPABASE_URL !== "" && env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "";
