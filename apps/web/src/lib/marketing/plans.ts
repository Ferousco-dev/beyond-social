import { type FaqItem, type PricingTier } from "./types";

import { PLAN_LIST, priceLabel } from "@/lib/billing/plans";

/**
 * Marketing pricing cards, derived from the billing catalogue.
 *
 * These were once a separate hand-written list and drifted from what Stripe
 * charges, which meant the landing page advertised prices the product did not
 * honour. Deriving them removes the possibility rather than the likelihood.
 */
export const PRICING_TIERS: readonly PricingTier[] = PLAN_LIST.map((plan) => ({
  name: plan.name,
  price: priceLabel(plan),
  description: plan.description,
  videos: `${plan.credits} videos / month`,
  features: plan.features,
  featured: plan.featured,
  cta: plan.cta,
}));

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "Do I need cameras or editing software?",
    answer:
      "No. Beyond Social generates video from your photos and a description, then gives you an in-browser editor for any final touches. Nothing else to install.",
  },
  {
    question: "Which platforms can I publish to?",
    answer:
      "TikTok, Instagram, Facebook, and YouTube Shorts. Each post is captioned and formatted for its destination and scheduled for peak engagement.",
  },
  {
    question: "How realistic are the videos?",
    answer:
      "They are generated with a WAN-class model from your own photos, producing ultra-realistic talking-avatar and product clips rather than obvious animation.",
  },
  {
    question: "Can I edit a video after it is generated?",
    answer:
      "Yes. Every draft opens in a timeline editor where you can trim, caption, adjust scenes, and add music before publishing.",
  },
  {
    question: "How does scheduling decide when to post?",
    answer:
      "It recommends times based on platform-specific engagement patterns for your audience, rather than a single generic best time.",
  },
  {
    question: "What happens when I run out of video credits?",
    answer:
      "You keep access to everything you have created and can upgrade at any time. Credits reset at the start of each billing cycle.",
  },
];
