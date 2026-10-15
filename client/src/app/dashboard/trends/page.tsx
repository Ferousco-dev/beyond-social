import { type Metadata } from "next";

import { DiscoverScroller } from "@/features/discover/components/discover-scroller";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { plansResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

/**
 * Searching TikTok and Instagram and scrolling what comes back. The search
 * itself runs on the Go API.
 */
export default async function TrendsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const [user, plans] = await Promise.all([getCurrentUser(), goApi("/api/v1/plans", plansResponse, { anonymous: true })]);
  const free = plans.ok ? plans.data.data : null;
  const note =
    user.plan === "pro"
      ? "Included in Pro"
      : free
        ? `Free: ${free.free_searches_per_day} a day, ${free.free_search_results} results each`
        : "Free plan limits apply";

  // Full height rather than page flow: the feed scrolls inside itself, so the
  // search bar has to stay put while it does.
  return (
    <div className="h-[calc(100dvh-4rem)]">
      <DiscoverScroller
        note={note}
        initialQuery={params.q?.slice(0, 160) ?? ""}
        initialPlatform={params.platform === "instagram" ? "instagram" : "tiktok"}
        autoSearch
      />
    </div>
  );
}
