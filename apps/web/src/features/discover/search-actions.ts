"use server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { fetchPosters } from "@/lib/tiktok/oembed";
import { TikTokResearchClient } from "@/lib/tiktok/research";

import { type DiscoverPost, type DiscoverResult } from "./types";

/**
 * Searching TikTok from the scroller.
 *
 * The search runs on the server because the credentials do, and because a
 * browser cannot call the Research API at all. What comes back is a list of real
 * posts, which the scroller then embeds one at a time.
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

  const client = new TikTokResearchClient();
  if (!client.available) return { status: "unconfigured" };

  try {
    const posts = await client.search([parsed.data.query], RESULT_LIMIT);
    if (posts.length === 0) return { status: "ok", posts: [] };

    // Posters are a nicety: a lookup that fails leaves a post with no still,
    // which the scroller renders as a placeholder rather than dropping.
    const posters = await fetchPosters(posts.map((post) => post.url));

    const results: DiscoverPost[] = posts.map((post) => ({
      videoId: post.videoId,
      handle: post.handle,
      url: post.url,
      caption: post.description,
      viewCount: post.viewCount,
      thumbnailUrl: posters.get(post.url)?.thumbnailUrl ?? null,
    }));

    return { status: "ok", posts: results };
  } catch (error) {
    logger.error("tiktok search failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not reach TikTok just now." };
  }
}
