/**
 * One post, however it was obtained.
 *
 * TikTok's own Research API and a scraper return the same kind of thing in
 * different shapes, and the feed should not care which answered. Everything
 * optional is genuinely optional: a scraper that omits a field is normal, and a
 * missing view count must read as "not reported" rather than zero.
 */
import { z } from "zod";

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

/**
 * The same shape, checkable at runtime.
 *
 * Needed because these are now cached: a row read back from the table is data
 * from a third-party scraper that has been sitting in Postgres, and a shape
 * that was right when it was written is exactly what changes without notice.
 * The interface above stays the type everything is written against; this is the
 * gate anything crossing a storage boundary passes through.
 */
export const scrapedPostSchema = z.object({
  platform: z.enum(SCRAPE_PLATFORMS),
  videoId: z.string().min(1),
  url: z.string().url(),
  handle: z.string(),
  description: z.string(),
  viewCount: z.number().nullable(),
  likeCount: z.number().nullable(),
  commentCount: z.number().nullable(),
  shareCount: z.number().nullable(),
  durationSeconds: z.number().nullable(),
  hashtags: z.array(z.string()),
  transcript: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
}) satisfies z.ZodType<ScrapedPost>;
