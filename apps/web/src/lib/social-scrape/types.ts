/**
 * One post, however it was obtained.
 *
 * TikTok's own Research API and a scraper return the same kind of thing in
 * different shapes, and the feed should not care which answered. Everything
 * optional is genuinely optional: a scraper that omits a field is normal, and a
 * missing view count must read as "not reported" rather than zero.
 */
export const SCRAPE_PLATFORMS = ["tiktok", "instagram"] as const;
export type ScrapePlatform = (typeof SCRAPE_PLATFORMS)[number];

export interface ScrapedPost {
  readonly platform: ScrapePlatform;
  /** The platform's own id, used as a stable key and to build an embed. */
  readonly videoId: string;
  readonly url: string;
  readonly handle: string;
  readonly description: string;
  readonly viewCount: number | null;
  readonly likeCount: number | null;
  readonly commentCount: number | null;
  readonly shareCount: number | null;
  readonly durationSeconds: number | null;
  readonly hashtags: readonly string[];
  /**
   * Spoken audio, when the source transcribes it. Scrapers usually do not, so
   * this is normally null and an analysis leans on the caption instead.
   */
  readonly transcript: string | null;
  /** Poster frame. Scrapers return one, which saves a separate oEmbed lookup. */
  readonly thumbnailUrl: string | null;
}
