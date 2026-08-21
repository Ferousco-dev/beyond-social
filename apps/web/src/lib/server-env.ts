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
  GEMINI_API_KEY: z.string().default(""),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_PRICE_CREATOR: z.string().default(""),
  STRIPE_PRICE_STUDIO: z.string().default(""),
  // Social publishing. Each platform is independently configurable, because
  // TikTok and Meta app review do not complete on the same day.
  TIKTOK_CLIENT_KEY: z.string().default(""),
  TIKTOK_CLIENT_SECRET: z.string().default(""),
  META_APP_ID: z.string().default(""),
  META_APP_SECRET: z.string().default(""),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  FIRECRAWL_API_KEY: z.string().default(""),
  /**
   * Apify, which is how trending TikTok and Instagram content is actually
   * reached. The actor ids are configuration because they are third-party code
   * that gets deprecated and replaced; empty falls back to a documented default.
   */
  APIFY_TOKEN: z.string().default(""),
  APIFY_TIKTOK_ACTOR: z.string().default(""),
  APIFY_INSTAGRAM_ACTOR: z.string().default(""),
  CRON_SECRET: z.string().default(""),
  /**
   * Encrypts webhook signing secrets at rest, 32 bytes base64. Shared with the
   * edge function that sends deliveries, which needs the same key to sign with.
   * Empty means endpoints cannot be registered, which the page says out loud
   * rather than storing something it cannot use.
   */
  WEBHOOK_SECRET_KEY: z.string().default(""),
});

export const serverEnv = parseEnv(serverEnvSchema, {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_CREATOR: process.env.STRIPE_PRICE_CREATOR,
  STRIPE_PRICE_STUDIO: process.env.STRIPE_PRICE_STUDIO,
  TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY,
  TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
  META_APP_ID: process.env.META_APP_ID,
  META_APP_SECRET: process.env.META_APP_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
  APIFY_TOKEN: process.env.APIFY_TOKEN,
  APIFY_TIKTOK_ACTOR: process.env.APIFY_TIKTOK_ACTOR,
  APIFY_INSTAGRAM_ACTOR: process.env.APIFY_INSTAGRAM_ACTOR,
  CRON_SECRET: process.env.CRON_SECRET,
  WEBHOOK_SECRET_KEY: process.env.WEBHOOK_SECRET_KEY,
});

/**
 * Billing needs a secret key to create sessions and a webhook secret to trust
 * what Stripe sends back. Without both, checkout stays off rather than half
 * working.
 */
export const isBillingConfigured =
  serverEnv.STRIPE_SECRET_KEY !== "" && serverEnv.STRIPE_WEBHOOK_SECRET !== "";

/** Stripe price ids keyed by plan, for mapping a webhook back to a plan. */
export const STRIPE_PRICES: Readonly<Record<string, string | undefined>> = {
  creator: serverEnv.STRIPE_PRICE_CREATOR || undefined,
  studio: serverEnv.STRIPE_PRICE_STUDIO || undefined,
};

/**
 * The prompt engine can run only with an embedder, a generator, and a
 * service-role connection to the pgvector store. Without all three we skip
 * enhancement and generate from the raw prompt.
 */
export const isPromptEngineConfigured =
  serverEnv.SUPABASE_SERVICE_ROLE_KEY !== "" &&
  // Any one generation provider is enough: the gateway skips models whose
  // provider has no client, so a Gemini-only setup routes to Gemini.
  (serverEnv.ANTHROPIC_API_KEY !== "" ||
    serverEnv.GEMINI_API_KEY !== "" ||
    serverEnv.OPENAI_API_KEY !== "") &&
  // And any one embedding provider, which is a separate capability: a key that
  // generates text does not necessarily embed it.
  (serverEnv.VOYAGE_API_KEY !== "" ||
    serverEnv.OPENAI_API_KEY !== "" ||
    serverEnv.GEMINI_API_KEY !== "");

/** Trend discovery runs only with a Firecrawl key; without it the feed is empty. */
export const isTrendDiscoveryConfigured = serverEnv.FIRECRAWL_API_KEY !== "";
