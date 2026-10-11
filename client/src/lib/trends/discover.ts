import "server-only";

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

import { SEARCHABLE_CATEGORIES } from "./categories";
import { activeTrendSource } from "./sources";

/**
 * Trend discovery.
 *
 * One pass per niche against whichever source is available, writing what it
 * finds to the feed. The value is in what comes back being actionable: a trend
 * the user cannot immediately turn into a brief is trivia, and a trend they
 * cannot watch is a claim.
 *
 * Every row keeps the URL it came from, so a claim can be checked. View counts
 * are recorded only when a source measured them, and are never estimated: an
 * invented number is worse than no number.
 */

/** Trends go stale fast, so a row stops being shown after a fortnight. */
const TTL_DAYS = 14;

export interface DiscoveryResult {
  readonly sources: number;
  readonly discovered: number;
  readonly ok: boolean;
  readonly error?: string;
}

/**
 * Runs one discovery pass across every niche.
 *
 * Records the run either way: a source that silently fails looks exactly like
 * "nothing is trending", and those need to be distinguishable.
 */
export async function discoverTrends(): Promise<DiscoveryResult> {
  const source = activeTrendSource();
  if (source === null) {
    return { sources: 0, discovered: 0, ok: false, error: "No trend source is configured" };
  }

  const service = createServiceClient();
  const { data: run } = await service
    .from("trend_runs")
    .insert({} as never)
    .select("id")
    .single();
  const runId = (run as { id?: number } | null)?.id;

  let sources = 0;
  let discovered = 0;
  let failure: string | undefined;

  try {
    for (const category of SEARCHABLE_CATEGORIES) {
      const trends = await source.discover(category);
      if (trends.length === 0) continue;
      sources += 1;

      const rows = trends.map((trend) => ({
        title: trend.title,
        description: trend.description,
        category: trend.category,
        source_url: trend.sourceUrl,
        source_name: trend.sourceName,
        prompt: trend.prompt,
        confidence: trend.confidence,
        video_url: trend.videoUrl,
        author_handle: trend.authorHandle,
        view_count: trend.viewCount,
        discovered_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + TTL_DAYS * 24 * 3600_000).toISOString(),
      }));

      // Upsert on (title, source_url) so a repeat run refreshes a trend rather
      // than duplicating it. Must match the unique index exactly.
      const { error } = await service
        .from("trends")
        .upsert(rows as never, { onConflict: "title,source_url", ignoreDuplicates: false });
      if (error) throw new Error(error.message);
      discovered += rows.length;
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    logger.error("trend discovery failed", { error: failure, source: source.id });
  }

  if (runId !== undefined) {
    await service
      .from("trend_runs")
      .update({
        finished_at: new Date().toISOString(),
        sources,
        discovered,
        ok: failure === undefined,
        error: failure ?? null,
      } as never)
      .eq("id", runId);
  }

  return { sources, discovered, ok: failure === undefined, error: failure };
}
