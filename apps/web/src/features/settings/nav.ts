import {
  CreditCard,
  Gauge,
  Image,
  KeyRound,
  Palette,
  ScrollText,
  Share2,
  UserRound,
  Users,
  Mic,
  Webhook,
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
    href: "/dashboard/settings/brand",
    label: "You and your products",
    description: "A photo of you, and pictures of what you sell.",
    icon: Image,
  },
  {
    href: "/dashboard/settings/voice",
    label: "Voice",
    description: "Record a voice for your avatar videos.",
    icon: Mic,
  },
  {
    href: "/dashboard/settings/connections",
    label: "Connectors",
    description: "The social accounts you publish to.",
    icon: Share2,
  },
  {
    href: "/dashboard/settings/billing",
    label: "Billing",
    // No invoice record exists anywhere in the schema, so this does not promise
    // one. Receipts live in Stripe's portal, which the page links to.
    description: "Your plan, your credit balance, and top-ups.",
    icon: CreditCard,
  },
  {
    href: "/dashboard/settings/usage",
    label: "Usage",
    // Credits, not dollars: the page reports what the user spent, not what the
    // provider bills us, because only the first is a number they hold.
    description: "Credits spent, runs, and how fast models ran.",
    icon: Gauge,
  },
  {
    href: "/dashboard/settings/team",
    label: "Team",
    description: "Who else can work in this workspace.",
    icon: Users,
  },
  {
    href: "/dashboard/settings/api-keys",
    label: "API keys",
    description: "Call the API from your own code.",
    icon: KeyRound,
  },
  {
    href: "/dashboard/settings/webhooks",
    label: "Webhooks",
    description: "Get a signed request when something finishes.",
    icon: Webhook,
  },
  {
    href: "/dashboard/settings/logs",
    label: "Activity log",
    description: "Everything the platform did on your behalf.",
    icon: ScrollText,
  },
];
