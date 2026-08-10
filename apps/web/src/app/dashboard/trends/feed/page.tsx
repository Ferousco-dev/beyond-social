import { type Metadata } from "next";

import { TrendsFeed } from "@/features/dashboard/components/trends-feed";
import { getTrends } from "@/lib/trends/queries";

export const metadata: Metadata = { title: "Trend feed" };
export const dynamic = "force-dynamic";

/**
 * The written trend feed, parked.
 *
 * Superseded by the TikTok scroller at `/dashboard/trends` and deliberately not
 * linked from anywhere. It is kept reachable, and its discovery run is off, so
 * the decision to bring it back or delete it can be made by looking at it rather
 * than from memory.
 */
export default async function TrendFeedPage() {
  const feed = await getTrends();

  return <TrendsFeed feed={feed} />;
}
