"use server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isGoApiConfigured } from "@/lib/go-api/client";
import { parseSocialUrl } from "@/lib/social-scrape/url";

import { runDiscovery } from "./go-discovery";
import { type DiscoverPost } from "./types";

/**
 * Looking up the one post someone pastes a link to, rather than searching for
 * it. Runs through the Go API like a search, so the post is stored and can be
 * transformed.
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

  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const outcome = await runDiscovery({ url: target.url });
  if (outcome.status === "failed") {
    logger.warn("post url discovery failed", { platform: target.platform, message: outcome.message });
    return { status: "error", message: "Could not reach that post just now." };
  }
  const [post] = outcome.posts;
  return post ? { status: "ok", post } : { status: "not_found" };
}
