import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const rateLimitScopeSchema = z.object({
  scope: z.string(),
  keys: z.coerce.number(),
  peak_count: z.coerce.number(),
  total_count: z.coerce.number(),
  window_ends_at: z.string(),
});

export interface RateLimitScope {
  scope: string;
  keys: number;
  peakCount: number;
  totalCount: number;
  windowEndsAt: string;
}

export interface RateLimitPressure {
  observedAt: string;
  activeKeys: number;
  scopes: RateLimitScope[];
}

/** Rate-limit pressure by key scope. Null when unavailable. */
export async function getRateLimitPressure(limit = 20): Promise<RateLimitPressure | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_rate_limit_pressure", { p_limit: limit });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({
      observed_at: z.string(),
      active_keys: z.coerce.number(),
      scopes: z.array(rateLimitScopeSchema),
    })
    .safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    activeKeys: parsed.data.active_keys,
    scopes: parsed.data.scopes.map((s) => ({
      scope: s.scope,
      keys: s.keys,
      peakCount: s.peak_count,
      totalCount: s.total_count,
      windowEndsAt: s.window_ends_at,
    })),
  };
}

export interface CacheHealth {
  observedAt: string;
  liveEntries: number;
  expiredEntries: number;
  newestEntryAt: string | null;
  embeddingEntries: number;
  aiCalls: number;
  cachedCalls: number;
}

/** Cache health snapshot. Null when unavailable. */
export async function getCacheHealth(sinceHours = 24): Promise<CacheHealth | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_cache_health", {
    p_since: new Date(Date.now() - sinceHours * 3600_000).toISOString(),
  });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({
      observed_at: z.string(),
      live_entries: z.coerce.number(),
      expired_entries: z.coerce.number(),
      newest_entry_at: z.string().nullable(),
      embedding_entries: z.coerce.number(),
      ai_calls: z.coerce.number(),
      cached_calls: z.coerce.number(),
    })
    .safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    liveEntries: parsed.data.live_entries,
    expiredEntries: parsed.data.expired_entries,
    newestEntryAt: parsed.data.newest_entry_at,
    embeddingEntries: parsed.data.embedding_entries,
    aiCalls: parsed.data.ai_calls,
    cachedCalls: parsed.data.cached_calls,
  };
}
