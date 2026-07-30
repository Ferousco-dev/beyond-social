import {
  CreditCard,
  Gauge,
  KeyRound,
  Palette,
  Share2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The settings sections. One list, used by both the hub cards and the section
 * tabs, so a new section cannot appear in one place and not the other.
 */

export interface SettingsSection {
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    href: "/dashboard/settings/account",
    label: "Account",
    description: "Your name, email, and password.",
    icon: UserRound,
  },
  {
    href: "/dashboard/settings/appearance",
    label: "Appearance",
    description: "Light, dark, or follow your system.",
    icon: Palette,
  },
  {
    href: "/dashboard/settings/connections",
    label: "Connections",
    description: "The social accounts you publish to.",
    icon: Share2,
  },
  {
    href: "/dashboard/settings/billing",
    label: "Billing",
    description: "Your plan, credits, and invoices.",
    icon: CreditCard,
  },
  {
    href: "/dashboard/usage",
    label: "Usage",
    description: "What the AI has cost and how fast it ran.",
    icon: Gauge,
  },
  {
    href: "/dashboard/team",
    label: "Team",
    description: "Who else can work in this workspace.",
    icon: Users,
  },
  {
    href: "/dashboard/api-keys",
    label: "API keys",
    description: "Call the API from your own code.",
    icon: KeyRound,
  },
];
