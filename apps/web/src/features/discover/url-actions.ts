"use server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isScrapeConfigured, scrapePostByUrl } from "@/lib/social-scrape/search";
import { parseSocialUrl } from "@/lib/social-scrape/url";
import { fetchPosters } from "@/lib/tiktok/oembed";

import { toDiscoverPost } from "./map";
import { type DiscoverPost } from "./types";

/**
 * Scraping the one post someone pastes a link to, rather than searching for
 * it. The same route in for a link a person already has, alongside the
 * keyword search that is Discover's other way in.
 */

const schema = z.object({ url: z.string().trim().url().max(2000) });

export type ScrapeUrlResult =
  | { status: "ok"; post: DiscoverPost }
  /** Parsed but not a canonical TikTok or Instagram post link. */
  | { status: "unrecognised" }
  | { status: "not_found" }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export async function scrapePostFromUrl(input: z.input<typeof schema>): Promise<ScrapeUrlResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That does not look like a link." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to use a link." };

  const target = parseSocialUrl(parsed.data.url);
  if (!target) return { status: "unrecognised" };

  if (!isScrapeConfigured()) return { status: "unconfigured" };

  try {
    const post = await scrapePostByUrl(target.platform, target.url);
    if (!post) return { status: "not_found" };

    const posters =
      target.platform === "tiktok" && !post.thumbnailUrl
        ? await fetchPosters([post.url])
        : new Map<string, { thumbnailUrl: string | null }>();

    return { status: "ok", post: toDiscoverPost(post, posters) };
  } catch (error) {
    logger.error("post url scrape failed", {
      platform: target.platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not reach that post just now." };
  }
}
