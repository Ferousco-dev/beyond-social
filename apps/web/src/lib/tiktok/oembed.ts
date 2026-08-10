import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";

import { parseTikTokPost } from "./url";

/**
 * TikTok's oEmbed endpoint.
 *
 * Public and unauthenticated, which makes it the one part of this that works
 * before any API approval lands. It gives us a poster image and the author's
 * name for a post, which is what lets a feed of fifty results render as fifty
 * pictures rather than fifty embedded players.
 *
 * That distinction is the whole performance story of the scroller: an iframe per
 * result would load fifty TikTok players at once. Only the post being watched
 * gets one.
 */

const BASE = "https://www.tiktok.com/oembed";

/** A slow lookup must not hold a search open; the poster is nice, not vital. */
const TIMEOUT_MS = 5_000;

/**
 * Posters are immutable per post, so this is cached hard. The window is a day
 * rather than forever because TikTok rotates its CDN paths and a stale poster
 * renders as a broken image.
 */
const CACHE_SECONDS = 60 * 60 * 24;

const oembedSchema = z.object({
  title: z.string().default(""),
  author_name: z.string().default(""),
  thumbnail_url: z.string().url().optional(),
  thumbnail_width: z.number().optional(),
  thumbnail_height: z.number().optional(),
});

export interface TikTokPoster {
  readonly thumbnailUrl: string | null;
  readonly authorName: string;
  readonly title: string;
}

/**
 * Looks up the poster for one post.
 *
 * Never throws and never rejects a search: a post with no poster still shows,
 * as a placeholder that plays when opened. The URL is re-parsed before it is
 * sent, so nothing unvalidated reaches TikTok in a query string.
 */
export async function fetchPoster(url: string): Promise<TikTokPoster | null> {
  const post = parseTikTokPost(url);
  if (!post) return null;

  try {
    const response = await fetch(`${BASE}?url=${encodeURIComponent(post.url)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) return null;

    const parsed = oembedSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    return {
      thumbnailUrl: parsed.data.thumbnail_url ?? null,
      authorName: parsed.data.author_name,
      title: parsed.data.title,
    };
  } catch (error) {
    logger.warn("tiktok oembed lookup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Posters for many posts at once.
 *
 * Concurrent rather than sequential: these are independent requests and a feed
 * of twenty would otherwise wait twenty round trips before rendering anything.
 */
export async function fetchPosters(
  urls: readonly string[],
): Promise<ReadonlyMap<string, TikTokPoster>> {
  const unique = [...new Set(urls)];
  const results = await Promise.all(
    unique.map(async (url) => [url, await fetchPoster(url)] as const),
  );

  return new Map(results.filter((entry): entry is [string, TikTokPoster] => entry[1] !== null));
}
