import type { DiscoverPost } from "@/features/discover/types";

const PRODUCT_HINTS = [
  "buy", "shop", "sale", "price", "discount", "deal", "order", "link in bio",
  "use my code", "discount code", "ad", "#ad", "sponsored", "product", "brand",
  "skincare", "serum", "moisturizer", "unboxing", "review", "haul",
];

/**
 * Interim grouping until the backend classifies videos itself: a post is
 * treated as product-focused when its caption or hashtags carry commerce
 * wording. The panel says so, so the grouping is never mistaken for analysis.
 */
export function splitPosts(posts: readonly DiscoverPost[]): {
  humanLed: DiscoverPost[];
  productFocused: DiscoverPost[];
} {
  const humanLed: DiscoverPost[] = [];
  const productFocused: DiscoverPost[] = [];
  for (const post of posts) {
    const text = `${post.caption} ${post.hashtags.join(" ")}`.toLowerCase();
    if (PRODUCT_HINTS.some((hint) => text.includes(hint))) {
      productFocused.push(post);
    } else {
      humanLed.push(post);
    }
  }
  return { humanLed, productFocused };
}

export function formatCount(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}
