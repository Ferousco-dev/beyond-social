import { Briefcase, Coffee, Dumbbell, Mic, Plane, Sparkles, type LucideIcon } from "lucide-react";

export interface Trend {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly views: number;
  /** Week over week change, so growth has a magnitude and not just a flag. */
  readonly growthPercent: number;
  readonly icon: LucideIcon;
  readonly prompt: string;
}

export interface TrendCategory {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const CATEGORIES: readonly TrendCategory[] = [
  { id: "fashion", label: "Fashion", icon: Sparkles },
  { id: "tech", label: "Technology", icon: Briefcase },
  { id: "food", label: "Food & Beverage", icon: Coffee },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "beauty", label: "Beauty", icon: Mic },
  { id: "travel", label: "Travel", icon: Plane },
] as const;

export const TRENDS: readonly Trend[] = [
  {
    id: "t1",
    title: "Get Ready With Me",
    description: "Morning routine transformations with quick cuts",
    category: "fashion",
    views: 2_400_000,
    growthPercent: 38,
    icon: Sparkles,
    prompt:
      "Create a 30-second GRWM video showing a morning routine transformation with quick cuts between outfits",
  },
  {
    id: "t2",
    title: "POV: Unboxing Experience",
    description: "First-person product reveals with ASMR elements",
    category: "tech",
    views: 1_800_000,
    growthPercent: 24,
    icon: Briefcase,
    prompt:
      "Make a POV unboxing video with ASMR sound design, showing the product reveal from first-person perspective",
  },
  {
    id: "t3",
    title: "Recipe: 60-Second Meals",
    description: "Hyper-fast cooking tutorials with satisfying results",
    category: "food",
    views: 3_100_000,
    growthPercent: 52,
    icon: Coffee,
    prompt:
      "Create a 60-second recipe video with fast-paced editing showing the cooking process and final dish",
  },
  {
    id: "t4",
    title: "Gym Progress Montage",
    description: "Before/after transformations with trending audio",
    category: "fitness",
    views: 1_200_000,
    growthPercent: -6,
    icon: Dumbbell,
    prompt:
      "Build a gym progress montage video with before/after clips set to trending fitness audio",
  },
  {
    id: "t5",
    title: "Skincare Routine ASMR",
    description: "Satisfying product application sounds and visuals",
    category: "beauty",
    views: 2_900_000,
    growthPercent: 31,
    icon: Mic,
    prompt:
      "Create an ASMR skincare routine video focusing on satisfying product application sounds and close-up visuals",
  },
  {
    id: "t6",
    title: "Hidden Travel Gems",
    description: "Undiscovered locations with cinematic transitions",
    category: "travel",
    views: 1_500_000,
    growthPercent: 19,
    icon: Plane,
    prompt:
      "Produce a travel video showcasing hidden gems with cinematic transitions and drone-style footage",
  },
  {
    id: "t7",
    title: "Day in the Life",
    description: "Relatable daily routines with authentic moments",
    category: "fashion",
    views: 2_200_000,
    growthPercent: -3,
    icon: Sparkles,
    prompt: "Film a day in the life video showing authentic daily moments and routines",
  },
  {
    id: "t8",
    title: "Tech Hacks 30 Seconds",
    description: "Quick productivity tips with visual demonstrations",
    category: "tech",
    views: 1_700_000,
    growthPercent: 27,
    icon: Briefcase,
    prompt: "Create a 30-second tech hack video with visual demonstrations of productivity tips",
  },
] as const;
