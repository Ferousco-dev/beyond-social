import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { serverEnv } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/service";
import { type Json } from "@/lib/supabase/database.types";

import { scrapedPostSchema, type ScrapedPost, type ScrapePlatform } from "./types";

/**
 * Searches already paid for, shared across users.
 *
 * An Apify run is seconds of waiting and a charge, and the results are public
 * posts that are identical whoever asked for them. Two people searching the
 * same term on the same afternoon were two runs; so was one person going back
 * to a search from a minute ago.
 *
 * Read through the service role because the table is deliberately not writable
 * by users: everybody reads the same rows, so a client that could write them
 * could poison what everybody else sees.
 *
 * Every failure here is swallowed and logged. A cache that cannot be reached
 * must degrade to an ordinary search, never to a broken page.
 */

/** Trending stops trending. Past this a hit is worse than a miss. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** Folded so "Fashion" and "fashion " are one row rather than three scrapes. */
function keyFor(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Empty string rather than null: the primary key needs a real value, and a
 * request with no resolved country (local dev, outside Vercel's edge) is its
 * own cacheable bucket, not a miss against every country-specific one.
 */
function countryFor(countryCode: string | null): string {
  return countryCode ?? "";
}

function isConfigured(): boolean {
  return serverEnv.SUPABASE_SERVICE_ROLE_KEY !== "";
}

const rowSchema = z.object({
  posts: z.array(z.unknown()),
  fetched_at: z.string(),
});

export async function readCachedPosts(
  platform: ScrapePlatform,
  query: string,
  countryCode: string | null,
): Promise<readonly ScrapedPost[] | null> {
  if (!isConfigured()) return null;

  try {
    const { data, error } = await createServiceClient()
      .from("scrape_cache")
      .select("posts, fetched_at")
      .eq("platform", platform)
      .eq("query", keyFor(query))
      .eq("country", countryFor(countryCode))
      .maybeSingle();

    if (error || !data) return null;

    const parsed = rowSchema.safeParse(data);
    if (!parsed.success) return null;

    const age = Date.now() - new Date(parsed.data.fetched_at).getTime();
    if (!Number.isFinite(age) || age > MAX_AGE_MS) return null;

    /*
     * Re-validated on the way out, not trusted because it came from our own
     * table. The rows were written from a third-party scraper, and a shape that
     * was fine six hours ago is exactly the thing that changes without notice.
     */
    const posts = parsed.data.posts
      .map((post) => scrapedPostSchema.safeParse(post))
      .flatMap((result) => (result.success ? [result.data] : []));

    return posts.length > 0 ? posts : null;
  } catch (error) {
    logger.warn("scrape cache read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function writeCachedPosts(
  platform: ScrapePlatform,
  query: string,
  posts: readonly ScrapedPost[],
  countryCode: string | null,
): Promise<void> {
  // An empty result is not cached. "Nothing came back" is as often a scraper
  // having a bad minute as it is a term with no posts, and holding that answer
  // for six hours turns a blip into an outage.
  if (!isConfigured() || posts.length === 0) return;

  try {
    const supabase = createServiceClient();
    await supabase.from("scrape_cache").upsert(
      {
        platform,
        query: keyFor(query),
        country: countryFor(countryCode),
        // Through JSON rather than cast: the column is `jsonb`, and the
        // generated type wants a plain serialisable value rather than the
        // readonly array the rest of this module passes around.
        posts: JSON.parse(JSON.stringify(posts)) as Json,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "platform,query,country" },
    );

    // Swept from the read path rather than a cron entry: the table is small and
    // this keeps it honest without another scheduled job to forget about.
    await supabase.rpc("prune_scrape_cache");
  } catch (error) {
    logger.warn("scrape cache write failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
