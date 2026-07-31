import { type Metadata } from "next";

import { UsagePage } from "@/features/usage/components/usage-page";
import { parseRange } from "@/features/usage/lib/range";

export const metadata: Metadata = { title: "Usage" };

export default async function Usage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  return <UsagePage range={parseRange(range)} />;
}
