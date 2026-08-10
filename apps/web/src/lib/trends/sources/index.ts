import "server-only";

import { FirecrawlTrendSource } from "./firecrawl-videos";
import { TikTokTrendSource } from "./tiktok-source";
import { type TrendSource } from "./types";

export { type DiscoveredTrend, type TrendSource } from "./types";

/**
 * Which source a discovery run should use.
 *
 * Preference order, not a list to merge. TikTok's own API and a reading of the
 * open web disagree about the same niche in ways that cannot be reconciled
 * automatically, and a feed holding both would be presenting a measured view
 * count next to an inferred one as though they were the same kind of fact.
 * Whichever source can answer, answers.
 */
export function activeTrendSource(): TrendSource | null {
  const sources: readonly TrendSource[] = [new TikTokTrendSource(), new FirecrawlTrendSource()];
  return sources.find((source) => source.available) ?? null;
}
