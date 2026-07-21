import { Camera, MessageCircle, Music, Play, type LucideIcon } from "lucide-react";

export interface Platform {
  readonly id: string;
  readonly name: string;
  readonly icon: LucideIcon;
  readonly color: string;
}

export interface RecommendedTime {
  readonly time: string;
  readonly label: string;
  readonly reason: string;
}

export interface PlatformSchedule {
  readonly platform: Platform;
  readonly recommendedTimes: readonly RecommendedTime[];
  readonly caption: string;
  readonly hashtags: string;
}

export interface ScheduledPost {
  readonly id: string;
  readonly title: string;
  readonly platforms: readonly string[];
  readonly scheduledFor: string;
  readonly status: "pending" | "published" | "failed";
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: "tiktok",
    name: "TikTok",
    icon: Music,
    color: "#000000",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Camera,
    color: "#E1306C",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: MessageCircle,
    color: "#1877F2",
  },
  {
    id: "youtube",
    name: "YouTube Shorts",
    icon: Play,
    color: "#FF0000",
  },
] as const;

export const RECOMMENDED_TIMES: Record<string, readonly RecommendedTime[]> = {
  tiktok: [
    { time: "7:00 AM", label: "Early morning", reason: "High engagement before work" },
    { time: "12:00 PM", label: "Lunch break", reason: "Peak midday activity" },
    { time: "7:00 PM", label: "Evening", reason: "Prime after-work hours" },
    { time: "9:00 PM", label: "Late night", reason: "Strong night owl audience" },
  ],
  instagram: [
    { time: "11:00 AM", label: "Mid-morning", reason: "High engagement during commute" },
    { time: "2:00 PM", label: "Afternoon", reason: "Post-lunch activity spike" },
    { time: "6:00 PM", label: "Evening", reason: "End-of-day browsing" },
    { time: "8:00 PM", label: "Prime time", reason: "Peak evening usage" },
  ],
  facebook: [
    { time: "9:00 AM", label: "Morning", reason: "Work break browsing" },
    { time: "3:00 PM", label: "Afternoon", reason: "Midday engagement" },
    { time: "6:00 PM", label: "Evening", reason: "After-work relaxation" },
  ],
  youtube: [
    { time: "2:00 PM", label: "Afternoon", reason: "High lunch break viewing" },
    { time: "5:00 PM", label: "Evening", reason: "Commute home viewing" },
    { time: "8:00 PM", label: "Prime time", reason: "Peak evening viewership" },
  ],
} as const;

export const SCHEDULED_POSTS: readonly ScheduledPost[] = [
  {
    id: "s1",
    title: "Trail shoe launch teaser",
    platforms: ["instagram", "tiktok"],
    scheduledFor: "2026-07-15 12:00 PM",
    status: "pending",
  },
  {
    id: "s2",
    title: "Founder story, part 2",
    platforms: ["youtube", "facebook"],
    scheduledFor: "2026-07-16 3:00 PM",
    status: "pending",
  },
  {
    id: "s3",
    title: "Summer sale countdown",
    platforms: ["instagram", "tiktok", "youtube"],
    scheduledFor: "2026-07-14 7:00 PM",
    status: "published",
  },
  {
    id: "s4",
    title: "Product unboxing reel",
    platforms: ["instagram"],
    scheduledFor: "2026-07-13 11:00 AM",
    status: "published",
  },
] as const;
