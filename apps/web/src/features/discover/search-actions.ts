"use server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isScrapeConfigured, searchPosts } from "@/lib/social-scrape/search";
import { fetchPosters } from "@/lib/tiktok/oembed";

import { type DiscoverPost, type DiscoverResult } from "./types";

/**
 * Searching TikTok from the scroller.
 *
 * Through Apify. TikTok's own Research API was the first route and is gone: it
 * is the more authoritative of the two and reports a real transcript, but access
 * is granted case by case and commercial products are usually refused, so it was
 * a dependency on something that might never arrive. It is in the history if it
 * is ever worth reviving.
 *
 * The search runs on the server because the token does. What comes back is a
 * list of real posts, which the scroller then embeds one at a time.
 */

/** A feed's worth. Beyond this the user is scrolling, not searching. */
const RESULT_LIMIT = 24;

const schema = z.object({
  query: z.string().trim().min(2, "Search for something a little longer").max(80),
});

export async function searchTikTok(input: z.input<typeof schema>): Promise<DiscoverResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Try another search" };
  }

  // Signed-in only. This spends a rate-limited quota against our own TikTok
  // credentials, so it is not something an anonymous visitor gets to drive.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to search TikTok." };

  if (!isScrapeConfigured()) return { status: "unconfigured" };

  try {
    const posts = await searchPosts("tiktok", parsed.data.query, RESULT_LIMIT);
    if (posts.length === 0) return { status: "ok", posts: [] };

    /*
     * Posters only for the posts that arrived without one. The scraper returns a
     * cover for most, so this is usually a short list, and a lookup that fails
     * leaves a post with no still, which the scroller renders as a placeholder
     * rather than dropping.
     */
    const missing = posts.filter((post) => post.thumbnailUrl === null);
    const posters = await fetchPosters(missing.map((post) => post.url));

    const results: DiscoverPost[] = posts.map((post) => ({
      videoId: post.videoId,
      handle: post.handle,
      url: post.url,
      caption: post.description,
      viewCount: post.viewCount,
      thumbnailUrl: post.thumbnailUrl ?? posters.get(post.url)?.thumbnailUrl ?? null,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      durationSeconds: post.durationSeconds,
      hashtags: post.hashtags,
      transcript: post.transcript,
    }));

    return { status: "ok", posts: results };
  } catch (error) {
    logger.error("tiktok search failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not reach TikTok just now." };
  }
}
