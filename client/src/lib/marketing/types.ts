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

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface FooterColumn {
  readonly title: string;
  readonly links: readonly NavLink[];
}
