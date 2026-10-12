import "server-only";

import { serverEnv } from "@/lib/server-env";

import { isApifyConfigured } from "./apify";
import { type ScrapePlatform } from "./types";

/**
 * Which Apify actor reads a given platform.
 *
 * What is left of the old in-app scraper: searching and looking up posts now
 * run on the Go API. This remains only for fetching one post's video file for
 * the deep analysis, which moves to the API with the rest of the analysis.
 */

const DEFAULT_ACTORS: Readonly<Record<ScrapePlatform, string>> = {
  tiktok: "clockworks~tiktok-scraper",
  instagram: "apify~instagram-scraper",
};

export function actorFor(platform: ScrapePlatform): string {
  const configured =
    platform === "tiktok" ? serverEnv.APIFY_TIKTOK_ACTOR : serverEnv.APIFY_INSTAGRAM_ACTOR;
  return configured.trim() !== "" ? configured : DEFAULT_ACTORS[platform];
}

export const isScrapeConfigured = isApifyConfigured;
