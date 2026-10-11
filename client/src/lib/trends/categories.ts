import {
  Briefcase,
  Cpu,
  Dumbbell,
  Film,
  GraduationCap,
  Plane,
  ShoppingBag,
  Shirt,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/**
 * The niches discovery sweeps, and the industries a user can say they work in.
 *
 * Deliberately one list. A user picks an industry so the product can show them
 * what is working in it, and that only holds if the thing they picked is the
 * same thing discovery files trends under. Two vocabularies that had to be kept
 * in step would drift, and the failure would be silent: a user in an industry
 * no trend is ever filed under just sees an empty feed.
 *
 * Ids are permanent. They are stored on `profiles.industry` and on every trend
 * row, so an id may be added but never renamed.
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
  { id: "general", label: "Any industry", icon: Film },
  { id: "fashion", label: "Fashion and apparel", icon: Shirt },
  { id: "beauty", label: "Beauty and skincare", icon: Sparkles },
  { id: "food", label: "Food and drink", icon: UtensilsCrossed },
  { id: "fitness", label: "Fitness and wellness", icon: Dumbbell },
  { id: "tech", label: "Technology and software", icon: Cpu },
  { id: "ecommerce", label: "Ecommerce and retail", icon: ShoppingBag },
  { id: "business", label: "Business and services", icon: Briefcase },
  { id: "education", label: "Education and coaching", icon: GraduationCap },
  { id: "travel", label: "Travel and hospitality", icon: Plane },
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

/**
 * What a user may say they work in. `general` is offered here as "no particular
 * industry", which is a real answer and better than leaving the question blank.
 */
export const INDUSTRY_CATEGORIES = TREND_CATEGORIES;

/** The niches discovery searches. `general` is an outcome, never a query. */
export const SEARCHABLE_CATEGORIES = TREND_CATEGORIES.filter(
  (category) => category.id !== "general",
);
