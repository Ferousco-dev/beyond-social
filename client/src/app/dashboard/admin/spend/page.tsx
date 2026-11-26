import { type Metadata } from "next";
import { type ReactNode } from "react";

import { WINDOWS, type Window } from "@/features/admin-console/components/spend-days";
import { SpendView } from "@/features/admin-console/components/spend-view";
import { spendResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · AI spend" };
export const dynamic = "force-dynamic";

export default async function AdminSpendPage({ searchParams }: { searchParams: Promise<{ days?: string }> }): Promise<ReactNode> {
  const params = await searchParams;
  const initial: Window = WINDOWS.find((window) => window === Number(params.days)) ?? 30;
  // All three periods at once and side by side: the same wait as one, and the tabs then switch instantly.
  const [week, month, quarter] = await Promise.all([
    goApi("/api/v1/admin/spend?days=7", spendResponse),
    goApi("/api/v1/admin/spend?days=30", spendResponse),
    goApi("/api/v1/admin/spend?days=90", spendResponse),
  ]);
  if (!week.ok || !month.ok || !quarter.ok) {
    const failed = [week, month, quarter].find((result) => !result.ok);
    return <p role="alert" className="text-sm text-destructive">{failed && !failed.ok ? failed.message : "AI spend could not load."}</p>;
  }
  return <SpendView initial={initial} windows={{ 7: week.data.data, 30: month.data.data, 90: quarter.data.data }} />;
}
