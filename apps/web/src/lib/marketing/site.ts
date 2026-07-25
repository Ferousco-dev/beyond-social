import { type FooterColumn, type NavLink } from "./types";

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Features", href: "/#features" },
  { label: "Workflow", href: "/#ai-workflow" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export const PLATFORMS: readonly string[] = ["TikTok", "Instagram", "YouTube Shorts", "Facebook"];

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Workflow", href: "/#ai-workflow" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Notes", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Help centre", href: "/help" },
      { label: "Community", href: "/community" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security", href: "/security" },
    ],
  },
];

export interface SocialLink {
  readonly label: string;
  readonly href: string;
}

/**
 * Social profiles. These point at the handles reserved for the product; update
 * each URL as the account goes live.
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { label: "TikTok", href: "https://www.tiktok.com/@beyondsocial" },
  { label: "Instagram", href: "https://www.instagram.com/beyondsocial" },
  { label: "YouTube", href: "https://www.youtube.com/@beyondsocial" },
  { label: "X", href: "https://x.com/beyondsocial" },
];
