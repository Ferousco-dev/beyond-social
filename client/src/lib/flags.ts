import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Feature flag reads.
 *
 * Cached briefly in process: flags are read on hot paths and change rarely, so
 * hitting the database per generation would be wasteful. The window is short
 * enough that turning something off in the console takes effect promptly, which
 * is the property that matters for a kill switch.
 */
const TTL_MS = 30_000;

let cache: { at: number; values: Map<string, boolean> } | null = null;

async function loadFlags(): Promise<Map<string, boolean>> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.values;

  const values = new Map<string, boolean>();
  if (isSupabaseConfigured) {
    try {
      const { data } = await createServiceClient().from("feature_flags").select("key, enabled");
      for (const row of data ?? []) values.set(row.key, row.enabled);
    } catch {
      // A flag lookup must never break a request; fall through to defaults.
    }
  }

  cache = { at: now, values };
  return values;
}

/**
 * Reads a flag, falling back to `fallback` when it is unknown or unreachable.
 * Callers pass the safe default, so an outage degrades to known behaviour
 * rather than to whatever `false` happens to mean at that call site.
 */
export async function isFlagEnabled(key: string, fallback: boolean): Promise<boolean> {
  const values = await loadFlags();
  return values.get(key) ?? fallback;
}
