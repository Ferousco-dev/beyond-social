import { Brain, CreditCard, Palette, UserRound, type LucideIcon } from "lucide-react";

/**
 * The settings sections. One list, used by both the hub cards and the section
 * tabs, so a new section cannot appear in one place and not the other.
 *
 * Ordered by what the reader came for: who you are, what you pay, then
 * preferences. What the videos are made out of is not here: a face, a product
 * shelf and a voice are material rather than preferences, and they live on the
 * assets page.
 *
 * Every description says what is on the page in one sentence, in the same voice.
 * They are the only thing distinguishing twelve rows of icon and label on the
 * phone list, so a vague one costs a wrong tap.
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
    description: "Your name, email, password, and deleting your account.",
    icon: UserRound,
  },
  {
    href: "/dashboard/settings/billing",
    label: "Plan and billing",
    description: "Your plan, credits, and purchases.",
    icon: CreditCard,
  },
  {
    href: "/dashboard/settings/memory",
    label: "Memory",
    description: "What the assistant remembers about you, and the switch to turn it off.",
    icon: Brain,
  },
  {
    href: "/dashboard/settings/appearance",
    label: "Appearance",
    description: "Light, dark, or follow your system.",
    icon: Palette,
  },
];
