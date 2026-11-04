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

/** English display name for an ISO 3166-1 alpha-2 code, e.g. "NG" -> "Nigeria". */
const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * What a result set was biased to, for the line above the grid.
 *
 * Null means an unbiased, global search (local dev, or a country Vercel could
 * not resolve), which is worth saying plainly rather than leaving the reader
 * to guess why a search of the same term reads differently another time.
 */
export function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return REGION_NAMES.of(code) ?? null;
  } catch {
    return null;
  }
}
