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
  {
    id: "t9",
    title: "Silent Review",
    description: "Product critiques told entirely through captions",
    category: "tech",
    views: 1_900_000,
    growthPercent: 44,
    icon: Briefcase,
    prompt:
      "Create a silent product review video where all commentary appears as on-screen captions over close-up shots",
  },
  {
    id: "t10",
    title: "Three Ingredient Swap",
    description: "Cheap pantry swaps that upgrade a dish",
    category: "food",
    views: 2_700_000,
    growthPercent: 35,
    icon: Coffee,
    prompt:
      "Create a 30-second video showing three cheap ingredient swaps that upgrade an everyday dish",
  },
  {
    id: "t11",
    title: "Five Minute Mobility",
    description: "Desk-friendly stretches shot in one take",
    category: "fitness",
    views: 1_400_000,
    growthPercent: 22,
    icon: Dumbbell,
    prompt: "Create a one-take five minute desk mobility routine with on-screen timers",
  },
  {
    id: "t12",
    title: "Packing Cube Tetris",
    description: "Overhead packing runs with satisfying fits",
    category: "travel",
    views: 2_100_000,
    growthPercent: 17,
    icon: Plane,
    prompt: "Create an overhead time-lapse of packing a carry-on with packing cubes",
  },
  {
    id: "t13",
    title: "Shade Match Test",
    description: "Side-by-side swatches under changing light",
    category: "beauty",
    views: 1_600_000,
    growthPercent: 12,
    icon: Mic,
    prompt: "Create a shade matching video comparing swatches under daylight and indoor light",
  },
  {
    id: "t14",
    title: "Thrift Flip",
    description: "Second-hand finds restyled on camera",
    category: "fashion",
    views: 3_400_000,
    growthPercent: 8,
    icon: Sparkles,
    prompt: "Create a thrift flip video showing a second-hand piece restyled into a full outfit",
  },
  {
    id: "t15",
    title: "One Bag Setup",
    description: "Everyday carry laid out and explained",
    category: "tech",
    views: 980_000,
    growthPercent: -2,
    icon: Briefcase,
    prompt: "Create an everyday carry video laying out the contents of a single bag with labels",
  },
  {
    id: "t16",
    title: "Slow Morning",
    description: "Unhurried routines with ambient sound",
    category: "fashion",
    views: 1_100_000,
    growthPercent: -9,
    icon: Sparkles,
    prompt: "Create a slow morning routine video with ambient sound and no voiceover",
  },
] as const;
