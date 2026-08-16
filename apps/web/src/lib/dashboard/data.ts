import { CalendarClock, Clapperboard, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";

import { type PlanId } from "@/lib/billing/plans";

export interface Project {
  readonly id: string;
  readonly title: string;
}

export interface ProjectGroup {
  readonly label: string;
  readonly projects: readonly Project[];
}

export interface Suggestion {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly prompt: string;
}

export interface DashboardUser {
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  /** The plan they are actually on. The sidebar said "Free plan" to everyone. */
  readonly plan: PlanId;
}

export interface SidebarProject {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly pinned: boolean;
}

export interface HistoryItem {
  readonly id: string;
  readonly title: string;
  readonly platform: string;
  readonly when: string;
  readonly status: "Published" | "Scheduled" | "Draft";
}

export interface Credits {
  readonly used: number;
  readonly total: number;
  readonly resetsInDays: number;
}

export const CREDITS: Credits = { used: 48, total: 60, resetsInDays: 12 };

export const HISTORY: readonly HistoryItem[] = [
  {
    id: "h1",
    title: "Trail shoe launch teaser",
    platform: "Instagram",
    when: "2h ago",
    status: "Published",
  },
  {
    id: "h2",
    title: "Founder story, part 2",
    platform: "TikTok",
    when: "Yesterday",
    status: "Scheduled",
  },
  {
    id: "h3",
    title: "Summer sale countdown",
    platform: "YouTube Shorts",
    when: "2 days ago",
    status: "Draft",
  },
  {
    id: "h4",
    title: "Product unboxing reel",
    platform: "Instagram",
    when: "4 days ago",
    status: "Published",
  },
  {
    id: "h5",
    title: "Behind the scenes cut",
    platform: "Facebook",
    when: "6 days ago",
    status: "Published",
  },
];

// Placeholder content until projects are backed by real data.
export const PROJECT_GROUPS: readonly ProjectGroup[] = [
  {
    label: "Today",
    projects: [
      { id: "p1", title: "Trail shoe launch teaser" },
      { id: "p2", title: "Founder story, part 2" },
    ],
  },
  {
    label: "Previous 7 days",
    projects: [
      { id: "p3", title: "Summer sale countdown" },
      { id: "p4", title: "Product unboxing reel" },
      { id: "p5", title: "Behind the scenes cut" },
      { id: "p6", title: "Customer testimonial remix" },
    ],
  },
];

export const SUGGESTIONS: readonly Suggestion[] = [
  {
    icon: Clapperboard,
    label: "Product video",
    prompt: "Create a 30-second product video for our newest release, upbeat and for Instagram.",
  },
  {
    icon: Sparkles,
    label: "Talking avatar",
    prompt: "Make a talking-avatar video introducing our brand from these product photos.",
  },
  {
    icon: TrendingUp,
    label: "Trend remix",
    prompt: "Turn this week's top trend in my niche into a short-form video I can post today.",
  },
  {
    icon: CalendarClock,
    label: "Schedule a week",
    prompt: "Plan and schedule a week of short-form videos about our summer collection.",
  },
];

/** Resolves a project by id, for routes that only receive the id. */
export function findProject(id: string): Project | undefined {
  return PROJECT_GROUPS.flatMap((group) => group.projects).find((project) => project.id === id);
}
