import { type Metadata } from "next";

import { DiscoverScroller } from "@/features/discover/components/discover-scroller";
import { getIndustry } from "@/lib/profile/industry";
import { categoryLabel } from "@/lib/trends/categories";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

/**
 * Searching TikTok and scrolling what comes back.
 *
 * This replaced a feed of trends written up as prose. Reading a paragraph about
 * a format is not the same as watching one land, and a creator deciding what to
 * make wants the second. The old feed is parked under `/dashboard/trends/feed`
 * rather than deleted, since the judgement about whether the written summaries
 * were worth keeping is not settled.
 *
 * The user's industry seeds the suggestions rather than filtering the search.
 * Filtering would quietly narrow results they did not ask to narrow; a first
 * suggestion about their own trade is the same help without the surprise.
 */
export default async function TrendsPage() {
  const industry = await getIndustry();

  // `general` means "no particular industry", which makes no useful search term.
  const terms =
    industry !== null && industry !== "general" ? [categoryLabel(industry).toLowerCase()] : [];

  // Full height rather than page flow: the feed scrolls inside itself, so the
  // search bar has to stay put while it does.
  return (
    <div className="h-[calc(100dvh-4rem)]">
      <DiscoverScroller industryTerms={terms} />
    </div>
  );
}
