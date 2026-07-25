import { type Metadata } from "next";

import { UsageOverview } from "@/features/dashboard/components/usage-overview";
import { USAGE_WINDOWS, type UsageWindowId } from "@/lib/dashboard/usage";

export const metadata: Metadata = { title: "Usage" };

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const { window } = await searchParams;
  const valid = USAGE_WINDOWS.some((option) => option.id === window);
  return <UsageOverview window={valid ? (window as UsageWindowId) : "24h"} />;
}
