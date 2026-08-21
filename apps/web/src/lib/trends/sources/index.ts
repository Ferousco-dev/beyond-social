import "server-only";

import { FirecrawlTrendSource } from "./firecrawl-videos";
import { type TrendSource } from "./types";

export { type DiscoveredTrend, type TrendSource } from "./types";

/**
 * Which source a discovery run should use.
 *
 * One source today, and still a list, because the shape is the point: sources
 * are preferred in order rather than merged. Two of them disagreeing about the
 * same niche cannot be reconciled automatically, and a feed holding both would
 * present a measured view count next to an inferred one as if they were the
 * same kind of fact.
 *
 * A TikTok source sat at the front of this list until the Research API was
 * dropped. The live surface is the Apify-backed search in Discover; this feeds
 * the written trend feed, which reads the open web.
 */
export function activeTrendSource(): TrendSource | null {
  const sources: readonly TrendSource[] = [new FirecrawlTrendSource()];
  return sources.find((source) => source.available) ?? null;
}
