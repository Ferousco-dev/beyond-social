import "server-only";

import type { CreditBalance, PeriodCounts } from "@/features/dashboard/components/overview/types";
import type { createClient } from "@/lib/supabase/server";

/** The totals behind the tiles, kept apart from the list reads that fill the panels. */

const DAY_MS = 86_400_000;
const CREDIT_PERIOD_DAYS = 30;

export type Client = Awaited<ReturnType<typeof createClient>>;

export const EMPTY_COUNTS: PeriodCounts = {
  generated: 0,
  ready: 0,
  failed: 0,
  published: 0,
  projectsStarted: 0,
};

/**
 * Exact counts over the window.
 *
 * `head: true` asks Postgres for the count without shipping any rows, which is
 * the only way a capped list and a true total can appear on the same screen
 * without one of them lying.
 */
export async function readCounts(supabase: Client, since: string): Promise<PeriodCounts> {
  const head = { count: "exact", head: true } as const;
  const [generated, ready, failed, published, projects] = await Promise.all([
    supabase.from("video_generations").select("id", head).gte("created_at", since),
    supabase
      .from("video_generations")
      .select("id", head)
      .eq("status", "ready")
      .gte("created_at", since),
    supabase
      .from("video_generations")
      .select("id", head)
      .eq("status", "failed")
      .gte("created_at", since),
    supabase
      .from("scheduled_posts")
      .select("id", head)
      .eq("status", "published")
      .gte("scheduled_for", since),
    supabase.from("projects").select("id", head).gte("created_at", since),
  ]);

  return {
    generated: generated.count ?? 0,
    ready: ready.count ?? 0,
    failed: failed.count ?? 0,
    published: published.count ?? 0,
    projectsStarted: projects.count ?? 0,
  };
}

/** Null rather than a placeholder balance when the profile cannot be read. */
export async function readCredits(supabase: Client, userId: string): Promise<CreditBalance | null> {
  const { data } = await supabase
    .from("profiles")
    .select("credits_total, credits_used, credits_period_start")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;

  const resetAt = new Date(data.credits_period_start).getTime() + CREDIT_PERIOD_DAYS * DAY_MS;
  return {
    total: data.credits_total,
    used: data.credits_used,
    resetsInDays: Math.max(0, Math.ceil((resetAt - Date.now()) / DAY_MS)),
  };
}
