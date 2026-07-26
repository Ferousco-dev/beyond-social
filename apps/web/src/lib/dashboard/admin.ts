import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const statsSchema = z.object({
  users: z.coerce.number(),
  orgs: z.coerce.number(),
  generations: z.coerce.number(),
  failed_generations: z.coerce.number(),
  ai_calls: z.coerce.number(),
  ai_cost: z.coerce.number(),
  ai_failures: z.coerce.number(),
  cached_calls: z.coerce.number(),
});

export interface PlatformStats {
  users: number;
  orgs: number;
  generations: number;
  failedGenerations: number;
  aiCalls: number;
  aiCost: number;
  aiFailures: number;
  cachedCalls: number;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
}

/** True when the signed-in user is an admin, decided by the database. */
export async function isAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

/** Platform health. Returns null when the caller is not an admin. */
export async function getPlatformStats(hours = 24): Promise<PlatformStats | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_platform_stats", {
    p_since: new Date(Date.now() - hours * 3600_000).toISOString(),
  });
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = statsSchema.safeParse(row);
  if (!parsed.success) return null;

  return {
    users: parsed.data.users,
    orgs: parsed.data.orgs,
    generations: parsed.data.generations,
    failedGenerations: parsed.data.failed_generations,
    aiCalls: parsed.data.ai_calls,
    aiCost: parsed.data.ai_cost,
    aiFailures: parsed.data.ai_failures,
    cachedCalls: parsed.data.cached_calls,
  };
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("key, enabled, description")
    .order("key");
  return error || !data ? [] : data;
}
