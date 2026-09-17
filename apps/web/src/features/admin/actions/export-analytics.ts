"use server";

import {
  getActiveUsersDaily,
  getAiSpendByModel,
  getAiSpendDaily,
  getGenerationsDaily,
  getSignupsDaily,
  getSubscriptionsByPlan,
  getUserTotals,
  type AiSpendByModel,
  type PlanBreakdown,
  type UserTotals,
} from "@/lib/dashboard/admin";

export interface AnalyticsExportRow {
  day: string;
  signups: number;
  dau: number;
  mau: number;
  generationsSucceeded: number;
  generationsFailed: number;
  aiSpendUsd: number;
}

export interface AnalyticsExport {
  days: number;
  totals: UserTotals | null;
  plans: PlanBreakdown[];
  daily: AnalyticsExportRow[];
  spendByModel: AiSpendByModel[];
}

/**
 * Read-only wrapper so the client-side Export button can assemble the same
 * dataset the page's Suspense sections show, in one shot, for download.
 * Re-fetches rather than reusing the page render: this runs in its own
 * request, on demand, only when an admin clicks Export.
 */
export async function exportAnalyticsAction(days: number): Promise<AnalyticsExport> {
  const [totals, plans, signups, actives, generations, spendDaily, spendByModel] =
    await Promise.all([
      getUserTotals(),
      getSubscriptionsByPlan(),
      getSignupsDaily(days),
      getActiveUsersDaily(days),
      getGenerationsDaily(days),
      getAiSpendDaily(days),
      getAiSpendByModel(days),
    ]);

  const byDay = new Map<string, AnalyticsExportRow>();
  function row(day: string): AnalyticsExportRow {
    const existing = byDay.get(day);
    if (existing) return existing;
    const created: AnalyticsExportRow = {
      day,
      signups: 0,
      dau: 0,
      mau: 0,
      generationsSucceeded: 0,
      generationsFailed: 0,
      aiSpendUsd: 0,
    };
    byDay.set(day, created);
    return created;
  }

  for (const p of signups) row(p.day).signups = p.value;
  for (const p of actives) {
    const r = row(p.day);
    r.dau = p.dau;
    r.mau = p.mau;
  }
  for (const p of generations) {
    const r = row(p.day);
    r.generationsSucceeded = p.succeeded;
    r.generationsFailed = p.failed;
  }
  for (const p of spendDaily) row(p.day).aiSpendUsd = p.costUsd;

  const daily = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));

  return { days, totals, plans, daily, spendByModel };
}
