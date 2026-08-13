import { type ScrapePlatform } from "@/lib/social-scrape/types";

/** What each platform is called in the interface, rather than its id. */
export const PLATFORM_NAME: Readonly<Record<ScrapePlatform, string>> = {
  tiktok: "TikTok",
  instagram: "Instagram",
};

/**
 * Views read as "1.2M", because the exact figure is noise at this size.
 *
 * Shared by the tile and the detail pane, which showed the same number in two
 * formats when each had its own copy of this.
 */
export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(views);
}
