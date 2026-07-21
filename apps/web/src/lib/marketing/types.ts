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
  readonly price: string;
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
