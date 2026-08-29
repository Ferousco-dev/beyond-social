import { type LucideIcon } from "lucide-react";

export interface NavLink {
  readonly label: string;
  readonly href: string;
}

export interface Feature {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
}

export interface WorkflowStep {
  readonly title: string;
  readonly description: string;
}

export interface Benefit {
  readonly title: string;
  readonly description: string;
}

export interface PricingTier {
  readonly name: string;
  /** Null on the free plan (no charge) and on a plan not priced yet. */
  readonly monthlyPriceUsd: number | null;
  readonly yearlyPriceUsd: number | null;
  readonly isFree: boolean;
  readonly description: string;
  readonly videos: string;
  readonly features: readonly string[];
  readonly featured: boolean;
  readonly cta: string;
  readonly href: "/signup";
}

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface FooterColumn {
  readonly title: string;
  readonly links: readonly NavLink[];
}
