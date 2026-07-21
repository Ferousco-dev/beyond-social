import { type Metadata } from "next";

import { TrendsFeed } from "@/features/dashboard/components/trends-feed";

export const metadata: Metadata = { title: "Trends" };

export default function TrendsPage() {
  return <TrendsFeed />;
}
