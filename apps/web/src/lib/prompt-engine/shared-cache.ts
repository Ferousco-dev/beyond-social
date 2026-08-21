import "server-only";

import { type EmbeddingCache } from "@beyond-social/prompt-engine";
import { type CacheEntry, type ResponseCache } from "@beyond-social/ai-gateway";

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Postgres-backed caches shared across every instance.
 *
 * The in-process versions are correct but nearly useless on Vercel: each
 * serverless instance has its own copy and loses it on cold start, so we keep
 * paying to embed text we have embedded before. These implement the same ports
 * against a table, so nothing about the calling code changes.
 *
 * Every failure here is swallowed and logged. A cache that can break the request
 * it was meant to speed up is worse than no cache, so a miss is the failure
 * mode rather than an exception.
 */

export class SupabaseEmbeddingCache implements EmbeddingCache {
  constructor(private readonly model: string) {}

  async get(key: string): Promise<readonly number[] | undefined> {
    try {
      const { data, error } = await createServiceClient().rpc("embedding_cache_get", {
        p_key: key,
      });
      if (error) throw new Error(error.message);
      // Postgres returns null for a miss, and float8[] arrives as number[].
      return Array.isArray(data) && data.length > 0 ? (data as number[]) : undefined;
    } catch (error) {
      logger.warn("embedding cache read failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  async set(key: string, embedding: readonly number[]): Promise<void> {
    try {
      const { error } = await createServiceClient().rpc("embedding_cache_put", {
        p_key: key,
        p_model: this.model,
        p_embedding: [...embedding],
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      logger.warn("embedding cache write failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Shared completion cache.
 *
 * Only deterministic calls reach this, which the gateway already enforces by
 * refusing to cache anything above temperature 0.
 *
 * The whole entry is stored as JSON rather than just the text, because a hit has
 * to return the model and token counts too. The token columns beside it are for
 * reporting on what the cache avoided, not for re-billing a hit.
 */
export class SupabaseResponseCache implements ResponseCache {
  /**
   * This store persists whatever `expiresAt` a caller's entry already carries
   * rather than dictating one of its own, so this is only the fallback the
   * gateway reaches for when nothing more specific was asked for: one hour,
   * matching what every call here has used since this cache was written.
   */
  readonly defaultTtlMs = 60 * 60 * 1000;

  async get(key: string): Promise<CacheEntry | undefined> {
    try {
      const { data, error } = await createServiceClient().rpc("response_cache_get", {
        p_key: key,
      });
      if (error) throw new Error(error.message);
      if (typeof data !== "string" || data === "") return undefined;

      const stored = JSON.parse(data) as CacheEntry;
      // The row's own expires_at already filtered this, so the entry is live;
      // expiresAt is restated for callers that check it themselves.
      return stored;
    } catch (error) {
      logger.warn("response cache read failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    try {
      // The whole entry is stored as JSON because token counts and the model are
      // part of what a hit must return, not just the text.
      const ttlSeconds = Math.max(Math.round((entry.expiresAt - Date.now()) / 1000), 1);
      const { error } = await createServiceClient().rpc("response_cache_put", {
        p_key: key,
        p_model: entry.model,
        p_response: JSON.stringify(entry),
        p_ttl_seconds: ttlSeconds,
        p_input_tokens: entry.result.inputTokens,
        p_output_tokens: entry.result.outputTokens,
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      logger.warn("response cache write failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
