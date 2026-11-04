/** The platforms a pasted link can come from. */
export const SCRAPE_PLATFORMS = ["tiktok", "instagram"] as const;
export type ScrapePlatform = (typeof SCRAPE_PLATFORMS)[number];
