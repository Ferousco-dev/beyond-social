import {
  Brain,
  Gauge,
  Palette,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/**
 * The settings sections. One list, used by both the hub cards and the section
 * tabs, so a new section cannot appear in one place and not the other.
 *
 * Ordered by what the reader came for, not alphabetically: who you are, then
 * where the videos go, then preferences, then usage, then the administrative
 * tail most people never open. What the videos are made out of is not here: a
 * face, a product shelf and a voice are material rather than preferences, and
 * they live on the assets page.
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
    description: "Your name, industry, email, and password.",
    icon: UserRound,
  },
  {
    href: "/dashboard/settings/memory",
    label: "Memory",
    description: "What the app has remembered about you.",
    icon: Brain,
  },
  {
    href: "/dashboard/settings/appearance",
    label: "Appearance",
    description: "Light, dark, or follow your system.",
    icon: Palette,
  },
  {
    href: "/dashboard/credits",
    label: "Usage",
    // Credits, not dollars: the page reports what the user spent, not what the
    // provider bills us, because only the first is a number they hold.
    description: "Credits spent, runs, and how fast models ran.",
    icon: Gauge,
  },
];
