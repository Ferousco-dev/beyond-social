import { type Metadata } from "next";

import { DiscoverScroller } from "@/features/discover/components/discover-scroller";

export const metadata: Metadata = { title: "Trends" };

/**
 * Searching TikTok and scrolling what comes back.
 *
 * This replaced a feed of trends written up as prose. Reading a paragraph about
 * a format is not the same as watching one land, and a creator deciding what to
 * make wants the second. The old feed is parked under `/dashboard/trends/feed`
 * rather than deleted, since the judgement about whether the written summaries
 * were worth keeping is not settled.
 */
export default function TrendsPage() {
  // Full height rather than page flow: the feed scrolls inside itself, so the
  // search bar has to stay put while it does.
  return (
    <div className="h-[calc(100dvh-4rem)]">
      <DiscoverScroller />
    </div>
  );
}
