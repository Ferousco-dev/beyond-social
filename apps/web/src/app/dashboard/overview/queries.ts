import "server-only";

import { WINDOW_DAYS, type OverviewSnapshot } from "@/features/dashboard/components/overview/types";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";
import { DEFAULT_TIMEZONE } from "@/lib/time/zone";
import { getUserTimeZone } from "@/lib/time/user-zone";

import { EMPTY_COUNTS, readCounts, readCredits } from "./aggregates";
import {
  GENERATION_COLUMNS,
  POST_COLUMNS,
  generationActivity,
  generationAttention,
  parseGenerations,
  parsePosts,
  postActivity,
  postAttention,
  toRunning,
  toUpcoming,
} from "./rows";

const DAY_MS = 86_400_000;
/** Panels stay scannable; the true totals come from the counts, not the lists. */
const PANEL_LIMIT = 4;
const ACTIVITY_LIMIT = 8;

const EMPTY: OverviewSnapshot = {
  running: { items: [], total: 0 },
  upcoming: { items: [], total: 0 },
  attention: { items: [], total: 0 },
  activity: [],
  counts: EMPTY_COUNTS,
  credits: null,
  timeZone: DEFAULT_TIMEZONE,
};

/**
 * Everything the overview shows, in one pass.
 *
 * The reads run in parallel because they are independent and the page blocks on
 * the slowest one. Counts are `head: true` exact counts rather than tallies over
 * fetched rows: a capped list cannot honestly report a total.
 *
 * Returns the empty snapshot rather than throwing when Supabase is unconfigured
 * or the caller is signed out, so the page renders an honest empty state.
 */
export async function getOverviewSnapshot(): Promise<OverviewSnapshot> {
  if (!isSupabaseConfigured) return EMPTY;

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return EMPTY;

  const nowIso = new Date().toISOString();
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString();

  const [
    running,
    upcoming,
    failedGenerations,
    failedPosts,
    readyGenerations,
    publishedPosts,
    counts,
    credits,
    timeZone,
  ] = await Promise.all([
    supabase
      .from("video_generations")
      .select(GENERATION_COLUMNS, { count: "exact" })
      .in("status", ["queued", "generating"])
      .order("created_at", { ascending: false })
      .limit(PANEL_LIMIT),
    supabase
      .from("scheduled_posts")
      .select(POST_COLUMNS, { count: "exact" })
      .in("status", ["scheduled", "publishing"])
      .gte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(PANEL_LIMIT),
    supabase
      .from("video_generations")
      .select(GENERATION_COLUMNS, { count: "exact" })
      .eq("status", "failed")
      .gte("created_at", since)
      .order("updated_at", { ascending: false })
      .limit(PANEL_LIMIT),
    supabase
      .from("scheduled_posts")
      .select(POST_COLUMNS, { count: "exact" })
      .eq("status", "failed")
      .gte("scheduled_for", since)
      .order("scheduled_for", { ascending: false })
      .limit(PANEL_LIMIT),
    supabase
      .from("video_generations")
      .select(GENERATION_COLUMNS)
      .eq("status", "ready")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
    supabase
      .from("scheduled_posts")
      .select(POST_COLUMNS)
      .eq("status", "published")
      .gte("scheduled_for", since)
      .order("scheduled_for", { ascending: false })
      .limit(ACTIVITY_LIMIT),
    readCounts(supabase, since),
    readCredits(supabase, user.id),
    getUserTimeZone(),
  ]);

  const attention = [
    ...parseGenerations(failedGenerations.data).map(generationAttention),
    ...parsePosts(failedPosts.data).map(postAttention),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, PANEL_LIMIT);

  const activity = [
    ...parseGenerations(readyGenerations.data).map(generationActivity),
    ...parsePosts(publishedPosts.data).map(postActivity),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, ACTIVITY_LIMIT);

  return {
    running: {
      items: parseGenerations(running.data).flatMap((row) => toRunning(row) ?? []),
      total: running.count ?? 0,
    },
    upcoming: {
      items: parsePosts(upcoming.data).flatMap((row) => toUpcoming(row) ?? []),
      total: upcoming.count ?? 0,
    },
    attention: {
      items: attention,
      total: (failedGenerations.count ?? 0) + (failedPosts.count ?? 0),
    },
    activity,
    counts,
    credits,
    timeZone,
  };
}
