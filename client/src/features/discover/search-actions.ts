"use server";

import { z } from "zod";

import { isGoApiConfigured } from "@/lib/go-api/client";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { SCRAPE_PLATFORMS } from "@/lib/social-scrape/types";

import { runDiscovery } from "./go-discovery";
import { type DiscoverResult } from "./types";

/**
 * Searching a platform from the scroller.
 *
 * The search itself now runs on the Go API, which calls Apify, keeps the
 * user's search history, and enforces per-user limits. This action only checks
 * the input and the session and passes the request on, so the Apify token and
 * all provider handling stay on the Go side.
 *
 * Paging is still done client-side from the one set returned: a second Apify
 * run is a second charge and returns an overlapping page.
 */

const schema = z.object({
  query: z.string().trim().min(2, "Search for something a little longer").max(80),
  platform: z.enum(SCRAPE_PLATFORMS).default("tiktok"),
});

export async function searchSocial(input: z.input<typeof schema>): Promise<DiscoverResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Try another search" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to search." };

  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const outcome = await runDiscovery(parsed.data);
  if (outcome.status === "failed") {
    logger.warn("discovery failed", { platform: parsed.data.platform, message: outcome.message });
    return { status: "error", message: outcome.message };
  }
  return { status: "ok", posts: outcome.posts, countryCode: null };
}
