import { type DocSection } from "./types";

export const MONEY_SECTIONS: readonly DocSection[] = [
  {
    id: "credits",
    title: "Credits and pricing",
    summary: "One price table drives every paid action.",
    paragraphs: [
      "Every paid action has a price in credits: a chat message, a trend search, an assistant message, a video. Before the work starts, the credits are reserved. If it succeeds they are kept, and if it fails they are returned.",
      "Edit prices on the Pricing page. Because the same table sets Free credit costs and Pro usage points, they cannot drift apart. Review prices after a month of real provider bills.",
    ],
    links: [{ label: "Pricing", href: "/dashboard/admin/pricing" }],
  },
  {
    id: "plans",
    title: "Free and Pro",
    summary: "How the two plans are limited.",
    paragraphs: [
      "Free members get a starting balance of credits, and every action costs about double. They have one avatar, a few trend searches a day with fewer results, and exports carry a watermark. They cannot buy packs.",
      "Pro members pay a monthly subscription and are not charged per action. Instead they have a five-hour limit and a weekly limit counted in usage points, and the weekly limit resets every Monday at 00:00 UTC. When a limit is reached they can wait, or switch on extra usage that spends purchased credits up to a monthly cap.",
      "The limits, the Free multiplier and the Free restrictions are all settings, not code. Expect to tune them.",
    ],
    links: [{ label: "Pricing", href: "/dashboard/admin/pricing" }],
  },
  {
    id: "packs",
    title: "Credit packs",
    summary: "Top-ups that Pro members use as extra usage.",
    paragraphs: [
      "Create, edit or switch off packs here. A pack is a price and a number of credits, sold through Stripe Checkout. Credits are added only after Stripe confirms payment.",
    ],
    links: [{ label: "Credit packs", href: "/dashboard/admin/packs" }],
  },
  {
    id: "stripe",
    title: "Connecting Stripe",
    summary: "Payments run once two keys are pasted.",
    paragraphs: [
      "Paste the Stripe secret key and the webhook signing secret under Provider keys. In Stripe, add a webhook endpoint at your API's public address plus /api/v1/callbacks/stripe. The exact events to send are listed on the Setup checklist row for the webhook secret.",
      "Test with Stripe's test keys and test cards first. Switch to live keys only when a full purchase, a renewal and a cancellation all behave.",
    ],
    links: [
      { label: "Provider keys", href: "/dashboard/admin/providers" },
      { label: "Setup checklist", href: "/dashboard/admin/setup" },
    ],
  },
  {
    id: "revenue",
    title: "Revenue",
    summary: "The last 30 days at a glance.",
    paragraphs: [
      "Shows subscription and pack revenue, active Pro members and failed payments, from payments recorded here. Stripe stays the book of record.",
    ],
    links: [{ label: "Revenue", href: "/dashboard/admin/revenue" }],
  },
  {
    id: "users",
    title: "Users",
    summary: "Look up an account and help someone.",
    paragraphs: [
      "Find a person, see their plan and credit balance, and adjust credits when you need to make something right. Every adjustment is written to the ledger so it can be audited later.",
      "Deleting an account erases the person's content but keeps the financial and audit records the law requires.",
    ],
    links: [{ label: "Users", href: "/dashboard/admin/users" }],
  },
  {
    id: "troubleshooting",
    title: "When something looks wrong",
    summary: "Where to look first.",
    paragraphs: [
      "An AI feature errors: check Models and Provider keys, then Alerts. Payments not arriving: check the Stripe webhook secret and Stripe's delivery log. Users report a limit message: look at the plan limits on Pricing. A video stalls: check Alerts for provider credit.",
    ],
    links: [
      { label: "Alerts", href: "/dashboard/admin/alerts" },
      { label: "Models", href: "/dashboard/admin/models" },
      { label: "Pricing", href: "/dashboard/admin/pricing" },
    ],
  },
];
