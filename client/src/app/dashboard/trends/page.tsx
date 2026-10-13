import { type Metadata } from "next";

import { DiscoverScroller } from "@/features/discover/components/discover-scroller";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

/**
 * Searching TikTok and Instagram and scrolling what comes back. The search
 * itself runs on the Go API.
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
