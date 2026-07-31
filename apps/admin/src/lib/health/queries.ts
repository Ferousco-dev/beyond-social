import "server-only";

import { HEALTH_THRESHOLDS, minutesInterval, windowStart } from "./config";
import { callHealthRpc } from "./rpc";
import {
  aiFailuresSchema,
  cacheHealthSchema,
  failureFeedSchema,
  rateLimitPressureSchema,
  stuckPipelineSchema,
} from "./schemas";
import type {
  AiFailures,
  CacheHealth,
  FailureFeed,
  RateLimitPressure,
  StuckPipeline,
} from "./types";

/**
 * Read paths for the health console.
 *
 * Each returns null when the signal could not be read, which the panels render
 * as "unavailable". Null is deliberately not folded into an empty result: "no
 * stuck jobs" and "we could not ask" are opposite answers, and a monitor that
 * confuses them reports all-clear during an outage.
 */

/** Work that entered a transient state and never left it. */
export async function getStuckPipeline(): Promise<StuckPipeline | null> {
  const row = await callHealthRpc("admin_stuck_pipeline", {
    p_generating_stale: minutesInterval(HEALTH_THRESHOLDS.generatingStaleMinutes),
    p_publishing_stale: minutesInterval(HEALTH_THRESHOLDS.publishingStaleMinutes),
    p_limit: HEALTH_THRESHOLDS.listLimit,
  });

  const parsed = stuckPipelineSchema.safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    generatingStuck: parsed.data.generating_stuck,
    publishingStuck: parsed.data.publishing_stuck,
    items: parsed.data.items.map((item) => ({
      kind: item.kind,
      id: item.id,
      detail: item.detail,
      since: item.since,
    })),
  };
}

/** Terminal failures in the window, newest first. */
export async function getFailureFeed(): Promise<FailureFeed | null> {
  const row = await callHealthRpc("admin_failure_feed", {
    p_since: windowStart(),
    p_limit: HEALTH_THRESHOLDS.listLimit,
  });

  const parsed = failureFeedSchema.safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    failedGenerations: parsed.data.failed_generations,
    failedPosts: parsed.data.failed_posts,
    items: parsed.data.items.map((item) => ({
      kind: item.kind,
      id: item.id,
      detail: item.detail,
      error: item.error,
      failedAt: item.failed_at,
    })),
  };
}

/** AI reliability grouped by provider and model. */
export async function getAiFailures(): Promise<AiFailures | null> {
  const row = await callHealthRpc("admin_ai_failures", {
    p_since: windowStart(),
    p_limit: HEALTH_THRESHOLDS.listLimit,
  });

  const parsed = aiFailuresSchema.safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    calls: parsed.data.calls,
    failures: parsed.data.failures,
    providers: parsed.data.providers.map((entry) => ({
      provider: entry.provider,
      model: entry.model,
      calls: entry.calls,
      failures: entry.failures,
      lastError: entry.last_error,
      lastFailedAt: entry.last_failed_at,
    })),
  };
}

/** Live rate limit windows, aggregated by key scope. */
export async function getRateLimitPressure(): Promise<RateLimitPressure | null> {
  const row = await callHealthRpc("admin_rate_limit_pressure", {
    p_limit: HEALTH_THRESHOLDS.listLimit,
  });

  const parsed = rateLimitPressureSchema.safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    activeKeys: parsed.data.active_keys,
    scopes: parsed.data.scopes.map((entry) => ({
      scope: entry.scope,
      keys: entry.keys,
      peakCount: entry.peak_count,
      totalCount: entry.total_count,
      windowEndsAt: entry.window_ends_at,
    })),
  };
}

/** Cache occupancy, plus the one hit rate that is actually recorded. */
export async function getCacheHealth(): Promise<CacheHealth | null> {
  const row = await callHealthRpc("admin_cache_health", { p_since: windowStart() });

  const parsed = cacheHealthSchema.safeParse(row);
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
