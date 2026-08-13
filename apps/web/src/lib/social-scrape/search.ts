import "server-only";

import { logger } from "@/lib/logger";
import { serverEnv } from "@/lib/server-env";

import { isApifyConfigured, runActor } from "./apify";
import { mapScrapedPost } from "./map";
import { type ScrapedPost, type ScrapePlatform } from "./types";

/**
 * Searching TikTok and Instagram through Apify.
 *
 * This replaced TikTok's Research API as the route to trending content. The
 * Research API is the more authoritative source and stays wired up behind its
 * own credentials, but access is granted case by case and commercial products
 * are usually refused, so waiting for it meant a feature that might never
 * arrive. A scraper is reachable with a token today.
 *
 * The actor ids are configuration rather than constants. They are third-party
 * code that gets deprecated and replaced, and a swap should be an env change
 * rather than a deploy.
 */

/** Sensible defaults, overridable when an actor is retired or bettered. */
const DEFAULT_ACTORS: Readonly<Record<ScrapePlatform, string>> = {
  tiktok: "clockworks~tiktok-scraper",
  instagram: "apify~instagram-scraper",
};

function actorFor(platform: ScrapePlatform): string {
  const configured =
    platform === "tiktok" ? serverEnv.APIFY_TIKTOK_ACTOR : serverEnv.APIFY_INSTAGRAM_ACTOR;
  return configured.trim() !== "" ? configured : DEFAULT_ACTORS[platform];
}

/**
 * The input an actor expects.
 *
 * Several keys are sent for the same idea because actors disagree about the
 * name, and every one of them ignores what it does not recognise. Sending three
 * spellings of "how many" is cheaper than a search that silently returns the
 * actor's own default of a thousand rows and bills for it.
 */
function inputFor(platform: ScrapePlatform, query: string, limit: number): Record<string, unknown> {
  if (platform === "tiktok") {
    return {
      searchQueries: [query],
      hashtags: [query.replace(/^#/, "")],
      resultsPerPage: limit,
      maxItems: limit,
      shouldDownloadVideos: false,
      shouldDownloadCovers: true,
      shouldDownloadSubtitles: false,
    };
  }

  /*
   * Instagram is reached by URL, not by the actor's `search` field.
   *
   * `search` + `searchType: "hashtag"` is what the actor documents and it
   * returns `no_items` for every term tried against it, with or without the
   * leading `#`. Instagram blocks the search endpoint the actor uses for it.
   * The explore page for the same tag still scrapes, so the tag is turned into
   * that URL here.
   *
   * The tag is stripped to what a hashtag can actually be: Instagram tags carry
   * no spaces or punctuation, so "before and after" is one tag, not three
   * words, and sending the raw query guaranteed a miss.
   *
   * `reels` rather than `posts`, because the tag's post feed is photographs.
   * Thirty rows off one tag came back as sixteen carousels and eleven stills
   * and not one video, which is nothing for a scroller that exists to play
   * them. The same URL under `reels` returns video every time.
   */
  const tag = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (tag === "") return { directUrls: [], resultsType: "reels", maxItems: limit };

  return {
    directUrls: [`https://www.instagram.com/explore/tags/${tag}/`],
    resultsType: "reels",
    resultsLimit: limit,
    maxItems: limit,
    addParentData: false,
  };
}

export const isScrapeConfigured = isApifyConfigured;

/**
 * Posts matching a query, most watched first.
 *
 * Returns an empty list rather than throwing when a run fails: the scroller has
 * to say something either way, and a search that found nothing and a scraper
 * that fell over look the same to a user. The distinction is in the log, which
 * is where it is useful.
 */
export async function searchPosts(
  platform: ScrapePlatform,
  query: string,
  limit: number,
): Promise<readonly ScrapedPost[]> {
  if (!isApifyConfigured() || query.trim() === "") return [];

  try {
    const rows = await runActor(actorFor(platform), inputFor(platform, query, limit));

    const posts = rows.flatMap((row) => {
      const post = mapScrapedPost(platform, row);
      return post ? [post] : [];
    });

    if (rows.length > 0 && posts.length === 0) {
      // Rows came back and none of them mapped, which almost always means the
      // actor changed its output. Worth saying loudly, with a sample.
      logger.warn("apify rows did not map to posts", {
        platform,
        rows: rows.length,
        sample: JSON.stringify(rows[0]).slice(0, 400),
      });
    }

    return posts.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, limit);
  } catch (error) {
    logger.error("apify search failed", {
      platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
