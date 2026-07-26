import { type Metadata } from "next";

import { TrendsFeed } from "@/features/dashboard/components/trends-feed";
import { getTrends } from "@/lib/trends/queries";

export const metadata: Metadata = { title: "Trends" };
export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const feed = await getTrends();

  return <TrendsFeed feed={feed} />;
}
