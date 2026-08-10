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

  return {
    search: query,
    searchType: "hashtag",
    resultsType: "posts",
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
