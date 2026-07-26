import { Briefcase, Coffee, Dumbbell, Plane, Sparkles, Wand2, type LucideIcon } from "lucide-react";

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
