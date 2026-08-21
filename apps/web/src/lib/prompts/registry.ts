import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * A system prompt that can change without a deploy.
 *
 * The code's own string is the prompt today, and stays the answer for any key
 * nobody has ever overridden: an empty table is not a broken app, it is an
 * app that has not needed this yet. Overriding a key writes an active row,
 * and the next request past the cache picks it up with no redeploy in
 * between, which is the entire point of this existing.
 *
 * Cached briefly per warm instance rather than read fresh every call. This
 * runs on the path of every chat turn and every Discover analysis, and a
 * prompt that is read far more often than it changes does not need a round
 * trip each time; five minutes is short enough that an override still lands
 * quickly and long enough that it costs almost nothing to check for one.
 */

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  readonly content: string | null;
  readonly expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

async function fetchActive(key: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("prompt_templates")
      .select("content")
      .eq("key", key)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      logger.warn("could not read a prompt template", { key, error: error.message });
      return null;
    }
    return (data as { content: string } | null)?.content ?? null;
  } catch (error) {
    logger.warn("prompt template lookup failed", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * The active override for `key`, or `fallback` when there is none.
 *
 * Never throws and never returns empty: a read that fails, a table that is
 * unconfigured, or a key nobody has overridden all resolve to the same
 * hardcoded text the caller already had, so this can be dropped into any
 * prompt-building function without a new failure mode to handle.
 */
export async function getPromptTemplate(key: string, fallback: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.content ?? fallback;

  const content = await fetchActive(key);
  cache.set(key, { content, expiresAt: Date.now() + TTL_MS });
  return content ?? fallback;
}
