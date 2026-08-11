import {
  Brain,
  CreditCard,
  Gauge,
  Image,
  KeyRound,
  Mic,
  Palette,
  Share2,
  UserRound,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";

/**
 * The settings sections. One list, used by both the hub cards and the section
 * tabs, so a new section cannot appear in one place and not the other.
 *
 * Ordered by what the reader came for, not alphabetically: who you are and what
 * the app makes videos out of, then where those videos go, then preferences,
 * then money, then the administrative tail most people never open.
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
    href: "/dashboard/settings/brand",
    // "You and your products" was three times the length of every other label
    // and wrapped on a phone. The description carries the detail.
    label: "Your pictures",
    description: "A photo of you, and pictures of what you sell.",
    icon: Image,
  },
  {
    href: "/dashboard/settings/voice",
    label: "Voice",
    description: "Record once, then have your videos speak in it.",
    icon: Mic,
  },
  {
    href: "/dashboard/settings/memory",
    label: "Memory",
    description: "What the app has remembered about you.",
    icon: Brain,
  },
  {
    href: "/dashboard/settings/connections",
    // Matches its own route and the word the OAuth screens use. It read
    // "Connectors" while every other surface called them connections.
    label: "Connections",
    description: "The social accounts you publish to.",
    icon: Share2,
  },
  {
    href: "/dashboard/settings/appearance",
    label: "Appearance",
    description: "Light, dark, or follow your system.",
    icon: Palette,
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
];
