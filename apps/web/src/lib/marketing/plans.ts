import { type FaqItem, type PricingTier } from "./types";

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    name: "Starter",
    price: "$19",
    description: "For creators finding their rhythm.",
    videos: "15 videos / month",
    features: ["Conversational creation", "In-browser editor", "Auto captions and hashtags"],
    featured: false,
    cta: "Start free",
  },
  {
    name: "Creator",
    price: "$49",
    description: "For creators publishing every day.",
    videos: "60 videos / month",
    features: [
      "Everything in Starter",
      "AI scheduling across platforms",
      "Trend discovery feed",
      "Priority generation",
    ],
    featured: true,
    cta: "Start free",
  },
  {
    name: "Studio",
    price: "$149",
    description: "For teams running multiple brands.",
    videos: "200 videos / month",
    features: [
      "Everything in Creator",
      "Batch scheduling",
      "Brand voice presets",
      "Priority support",
    ],
    featured: false,
    cta: "Talk to us",
  },
];

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
