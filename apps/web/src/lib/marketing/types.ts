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
  /** Null when the plan is not priced yet, which the card has to say out loud. */
  readonly price: string | null;
  readonly description: string;
  readonly videos: string;
  readonly features: readonly string[];
  readonly featured: boolean;
  readonly cta: string;
}

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface FooterColumn {
  readonly title: string;
  readonly links: readonly NavLink[];
}
