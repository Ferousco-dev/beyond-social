import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";
import {
  type PostStatus,
  type ProfileRow,
  type ProjectRow,
  type ScheduledPostRow,
  type SocialPlatform,
} from "@/lib/supabase/types";

import {
  CREDITS,
  HISTORY,
  PROJECT_GROUPS,
  type Credits,
  type HistoryItem,
  type ProjectGroup,
  type SidebarProject,
} from "./data";

const CREDIT_PERIOD_DAYS = 30;
const DAY_MS = 86_400_000;

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube Shorts",
};

const HISTORY_STATUS: Record<PostStatus, HistoryItem["status"]> = {
  published: "Published",
  scheduled: "Scheduled",
  publishing: "Scheduled",
  failed: "Draft",
};

/** Credits for the signed-in user, falling back to placeholder data locally. */
export async function getCredits(): Promise<Credits> {
  if (!isSupabaseConfigured) return CREDITS;

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return CREDITS;

  const { data } = await supabase
    .from("profiles")
    .select("credits_total, credits_used, credits_period_start")
    .eq("id", user.id)
    .single<Pick<ProfileRow, "credits_total" | "credits_used" | "credits_period_start">>();
  if (!data) return CREDITS;

  return {
    total: data.credits_total,
    used: data.credits_used,
    resetsInDays: daysUntilReset(data.credits_period_start),
  };
}

/** Projects for the signed-in user, grouped by recency, with a local fallback. */
export async function getProjectGroups(): Promise<readonly ProjectGroup[]> {
  if (!isSupabaseConfigured) return PROJECT_GROUPS;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .returns<ProjectSummary[]>();
  if (!data || data.length === 0) return [];

  return groupByRecency(data);
}

/** Recent scheduled posts as history rows, with a local fallback. */
export async function getHistory(): Promise<readonly HistoryItem[]> {
  if (!isSupabaseConfigured) return HISTORY;

  const supabase = await createClient();
  const { data } = await supabase
    .from("scheduled_posts")
    .select("id, platform, caption, scheduled_for, status")
    .order("scheduled_for", { ascending: false })
    .limit(20)
    .returns<PostSummary[]>();
  if (!data) return [];

  return data.map((post) => toHistoryItem(post));
}

const SIDEBAR_FALLBACK: readonly SidebarProject[] = PROJECT_GROUPS.flatMap((group) =>
  group.projects.map((project) => ({
    id: project.id,
    title: project.title,
    group: group.label,
    pinned: false,
  })),
);

/** Flat, pinned-aware project list for the sidebar, with a local fallback. */
export async function getSidebarProjects(): Promise<readonly SidebarProject[]> {
  if (!isSupabaseConfigured) return SIDEBAR_FALLBACK;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, title, pinned, created_at")
    .order("created_at", { ascending: false })
    .returns<SidebarRow[]>();
  if (!data || data.length === 0) return [];

  const now = Date.now();
  return data.map((project) => ({
    id: project.id,
    title: project.title,
    pinned: project.pinned,
    group: bucketLabel((now - new Date(project.created_at).getTime()) / DAY_MS),
  }));
}

function bucketLabel(ageDays: number): string {
  if (ageDays < 1) return "Today";
  if (ageDays < 7) return "Previous 7 days";
  return "Older";
}

function daysUntilReset(periodStart: string): number {
  const resetAt = new Date(periodStart).getTime() + CREDIT_PERIOD_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((resetAt - Date.now()) / DAY_MS));
}

type ProjectSummary = Pick<ProjectRow, "id" | "title" | "created_at">;
type SidebarRow = Pick<ProjectRow, "id" | "title" | "pinned" | "created_at">;

function groupByRecency(projects: readonly ProjectSummary[]): readonly ProjectGroup[] {
  const now = Date.now();
  const today: ProjectGroup["projects"][number][] = [];
  const week: ProjectGroup["projects"][number][] = [];
  const older: ProjectGroup["projects"][number][] = [];

  for (const project of projects) {
    const ageDays = (now - new Date(project.created_at).getTime()) / DAY_MS;
    const entry = { id: project.id, title: project.title };
    if (ageDays < 1) today.push(entry);
    else if (ageDays < 7) week.push(entry);
    else older.push(entry);
  }

  return [
    { label: "Today", projects: today },
    { label: "Previous 7 days", projects: week },
    { label: "Older", projects: older },
  ].filter((group) => group.projects.length > 0);
}

type PostSummary = Pick<
  ScheduledPostRow,
  "id" | "platform" | "caption" | "scheduled_for" | "status"
>;

function toHistoryItem(post: PostSummary): HistoryItem {
  return {
    id: post.id,
    title: post.caption,
    platform: PLATFORM_LABELS[post.platform],
    when: relativeTime(post.scheduled_for),
    status: HISTORY_STATUS[post.status],
  };
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / DAY_MS);
  if (days <= 0) {
    const hours = Math.max(1, Math.floor(diffMs / 3_600_000));
    return `${hours}h ago`;
  }
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}
