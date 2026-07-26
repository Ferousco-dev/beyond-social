import { CreditCard, Share2, UserRound, type LucideIcon } from "lucide-react";

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
];
