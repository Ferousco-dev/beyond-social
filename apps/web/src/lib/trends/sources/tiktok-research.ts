import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { isTikTokResearchConfigured, serverEnv } from "@/lib/server-env";

import { type TrendCategory } from "../categories";
import { parseTikTokPost } from "../tiktok-url";

/**
 * TikTok's Research API.
 *
 * The only official way to ask TikTok what is doing well on TikTok. It answers
 * with real posts and real view counts, which is the difference between showing
 * a creator what is working and showing them somebody's article about what is
 * working.
 *
 * Access is granted case by case, so this is written to be dormant: with no
 * credentials it reports itself unavailable and discovery uses the web source
 * instead. Nothing here has been exercised against the live API, because we do
 * not have keys for it; it is built to the documented request and response
 * shapes and every field is parsed rather than assumed.
 */

const BASE = "https://open.tiktokapis.com/v2";

/** A slow query must not hold a discovery run open indefinitely. */
const TIMEOUT_MS = 30_000;

/** How far back a query looks. TikTok caps the window at 30 days. */
const WINDOW_DAYS = 30;

/** Fetched per niche, then cut to the best. Their maximum per page is 100. */
const QUERY_COUNT = 40;

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

const videoSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  username: z.string().min(1),
  video_description: z.string().default(""),
  view_count: z.number().nonnegative().default(0),
  like_count: z.number().nonnegative().optional(),
});

const querySchema = z.object({
  data: z.object({ videos: z.array(videoSchema).default([]) }).optional(),
  error: z.object({ code: z.string().optional(), message: z.string().optional() }).optional(),
});

/** A post as TikTok reported it, before it is turned into a trend. */
export interface ResearchPost {
  readonly url: string;
  readonly handle: string;
  readonly description: string;
  readonly viewCount: number;
}

/** `YYYYMMDD`, which is the only date format the query endpoint accepts. */
function stamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export class TikTokResearchClient {
  constructor(private readonly doFetch: typeof globalThis.fetch = globalThis.fetch) {}

  get available(): boolean {
    return isTikTokResearchConfigured;
  }

  /**
   * Client credentials, which is the whole auth story here: the Research API
   * describes public posts rather than any one account, so there is no user to
   * act on behalf of and no token to keep.
   */
  private async token(): Promise<string | null> {
    const response = await this.doFetch(`${BASE}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: serverEnv.TIKTOK_RESEARCH_CLIENT_KEY,
        client_secret: serverEnv.TIKTOK_RESEARCH_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn("tiktok research token rejected", { status: response.status });
      return null;
    }

    const parsed = tokenSchema.safeParse(await response.json().catch(() => null));
    return parsed.success ? parsed.data.access_token : null;
  }

  /** The best-performing recent posts matching a niche, most watched first. */
  async topPosts(category: TrendCategory, limit: number): Promise<readonly ResearchPost[]> {
    if (!this.available) return [];

    const accessToken = await this.token();
    if (accessToken === null) return [];

    const now = new Date();
    const from = new Date(now.getTime() - WINDOW_DAYS * 24 * 3600_000);

    const response = await this.doFetch(
      `${BASE}/research/video/query/?fields=id,username,video_description,view_count,like_count`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            and: [
              {
                operation: "IN",
                field_name: "keyword",
                field_values: [category.label, category.id],
              },
            ],
          },
          start_date: stamp(from),
          end_date: stamp(now),
          max_count: QUERY_COUNT,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      logger.warn("tiktok research query failed", {
        status: response.status,
        category: category.id,
      });
      return [];
    }

    const parsed = querySchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success || parsed.data.error?.code) {
      logger.warn("tiktok research query rejected", { error: parsed.data?.error?.message });
      return [];
    }

    return (parsed.data.data?.videos ?? [])
      .map((video) => {
        // Composed and then re-parsed, so what leaves here has been through the
        // same validation as a URL scraped off a page.
        const post = parseTikTokPost(
          `https://www.tiktok.com/@${video.username}/video/${video.id}`,
        );
        if (!post) return null;

        return {
          url: post.url,
          handle: post.handle,
          description: video.video_description,
          viewCount: video.view_count,
        };
      })
      .filter((post): post is ResearchPost => post !== null)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
  }
}
