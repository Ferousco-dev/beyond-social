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
  // Firebase config is not a secret: it identifies the project to the client
  // SDK, same as a Supabase anon key. `measurementId` defaults to empty
  // because it does not exist until Google Analytics is linked to the Firebase
  // project in the console, which the CLI cannot do; analytics and error
  // reporting both no-op until it is set.
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default(""),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().default(""),
});

export const env = parseEnv(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

export const isSupabaseConfigured =
  env.NEXT_PUBLIC_SUPABASE_URL !== "" && env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "";

/** False until Google Analytics is linked to the Firebase project in console. */
export const isFirebaseConfigured =
  env.NEXT_PUBLIC_FIREBASE_API_KEY !== "" && env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID !== "";
