import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const stuckItemSchema = z.object({
  kind: z.string(),
  id: z.string(),
  detail: z.string(),
  since: z.string(),
});

export interface StuckItem {
  kind: string;
  id: string;
  detail: string;
  since: string;
}

export interface StuckPipeline {
  observedAt: string;
  generatingStuck: number;
  publishingStuck: number;
  items: StuckItem[];
}

/** Work stuck in a transient state past its threshold. Null when unavailable. */
export async function getStuckPipeline(limit = 20): Promise<StuckPipeline | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stuck_pipeline", { p_limit: limit });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({
      observed_at: z.string(),
      generating_stuck: z.coerce.number(),
      publishing_stuck: z.coerce.number(),
      items: z.array(stuckItemSchema),
    })
    .safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    generatingStuck: parsed.data.generating_stuck,
    publishingStuck: parsed.data.publishing_stuck,
    items: parsed.data.items,
  };
}

const failureItemSchema = z.object({
  kind: z.string(),
  id: z.string(),
  detail: z.string(),
  error: z.string(),
  failed_at: z.string(),
});

export interface FailureItem {
  kind: string;
  id: string;
  detail: string;
  error: string;
  failedAt: string;
}

export interface FailureFeed {
  observedAt: string;
  failedGenerations: number;
  failedPosts: number;
  items: FailureItem[];
}

/** Terminal failures in the window, newest first. Null when unavailable. */
export async function getFailureFeed(sinceHours = 24, limit = 20): Promise<FailureFeed | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_failure_feed", {
    p_since: new Date(Date.now() - sinceHours * 3600_000).toISOString(),
    p_limit: limit,
  });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({
      observed_at: z.string(),
      failed_generations: z.coerce.number(),
      failed_posts: z.coerce.number(),
      items: z.array(failureItemSchema),
    })
    .safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    failedGenerations: parsed.data.failed_generations,
    failedPosts: parsed.data.failed_posts,
    items: parsed.data.items.map((i) => ({
      kind: i.kind,
      id: i.id,
      detail: i.detail,
      error: i.error,
      failedAt: i.failed_at,
    })),
  };
}

const aiFailureProviderSchema = z.object({
  provider: z.string(),
  model: z.string(),
  calls: z.coerce.number(),
  failures: z.coerce.number(),
  last_failed_at: z.string().nullable(),
  last_error: z.string(),
});

export interface AiFailureProvider {
  provider: string;
  model: string;
  calls: number;
  failures: number;
  lastFailedAt: string | null;
  lastError: string;
}

export interface AiFailures {
  observedAt: string;
  calls: number;
  failures: number;
  providers: AiFailureProvider[];
}

/** AI reliability grouped by provider and model. Null when unavailable. */
export async function getAiFailures(sinceHours = 24, limit = 20): Promise<AiFailures | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ai_failures", {
    p_since: new Date(Date.now() - sinceHours * 3600_000).toISOString(),
    p_limit: limit,
  });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({
      observed_at: z.string(),
      calls: z.coerce.number(),
      failures: z.coerce.number(),
      providers: z.array(aiFailureProviderSchema),
    })
    .safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    calls: parsed.data.calls,
    failures: parsed.data.failures,
    providers: parsed.data.providers.map((p) => ({
      provider: p.provider,
      model: p.model,
      calls: p.calls,
      failures: p.failures,
      lastFailedAt: p.last_failed_at,
      lastError: p.last_error,
    })),
  };
}

