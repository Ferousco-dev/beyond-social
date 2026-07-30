import {
  Briefcase,
  Coffee,
  Dumbbell,
  Film,
  Plane,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/**
 * The niches discovery sweeps. Shared by the discovery run and the feed filter,
 * so a category cannot exist in one and not the other.
 */

export interface TrendCategory {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const TREND_CATEGORIES: readonly TrendCategory[] = [
  /**
   * Not every trend belongs to a niche. Plenty of what discovery finds is
   * format advice that applies anywhere, and filing it under whichever niche
   * happened to surface it is how "Educational How-To Guides" ended up
   * categorised as beauty.
   */
  { id: "general", label: "Any niche", icon: Film },
  { id: "fashion", label: "Fashion", icon: Sparkles },
  { id: "tech", label: "Technology", icon: Briefcase },
  { id: "food", label: "Food and drink", icon: Coffee },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "beauty", label: "Beauty", icon: Wand2 },
  { id: "travel", label: "Travel", icon: Plane },
];

export function categoryLabel(id: string): string {
  return TREND_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function categoryIcon(id: string): LucideIcon {
  return TREND_CATEGORIES.find((category) => category.id === id)?.icon ?? Sparkles;
}

/** Ids the extractor may return, so an unknown value can be rejected. */
export const TREND_CATEGORY_IDS = TREND_CATEGORIES.map((category) => category.id);

export function isTrendCategory(value: string): boolean {
  return TREND_CATEGORY_IDS.includes(value);
}

/** The niches discovery searches. `general` is an outcome, never a query. */
export const SEARCHABLE_CATEGORIES = TREND_CATEGORIES.filter(
  (category) => category.id !== "general",
);
