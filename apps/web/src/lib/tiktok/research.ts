import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { isTikTokResearchConfigured, serverEnv } from "@/lib/server-env";

import { type TrendCategory } from "@/lib/trends/categories";

import { parseTikTokPost } from "./url";

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

/**
 * What we ask for. Anything the granted scope does not cover is simply absent
 * from the response, which the schema above treats as normal.
 */
const QUERY_FIELDS = [
  "id",
  "username",
  "video_description",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
  "video_duration",
  "hashtag_names",
  "voice_to_text",
].join(",");

/** Fetched per niche, then cut to the best. Their maximum per page is 100. */
const QUERY_COUNT = 40;

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

/**
 * Every field is optional except identity.
 *
 * The Research API returns what the approved scope allows and omits the rest, so
 * a missing transcript or duration is a normal response rather than an error. A
 * required field here would fail the whole search over something we only wanted
 * if it happened to be there.
 */
const videoSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  username: z.string().min(1),
  video_description: z.string().default(""),
  view_count: z.number().nonnegative().default(0),
  like_count: z.number().nonnegative().optional(),
  comment_count: z.number().nonnegative().optional(),
  share_count: z.number().nonnegative().optional(),
  /** Seconds. The single most useful signal for pacing we can actually get. */
  video_duration: z.number().nonnegative().optional(),
  hashtag_names: z.array(z.string()).optional(),
  /**
   * TikTok's own transcription of the spoken audio. The closest thing to the
   * content of the video that any API of theirs will hand over, and the reason
   * an analysis can say anything about structure rather than just captions.
   */
  voice_to_text: z.string().optional(),
});

const querySchema = z.object({
  data: z.object({ videos: z.array(videoSchema).default([]) }).optional(),
  error: z.object({ code: z.string().optional(), message: z.string().optional() }).optional(),
});

/** A post as TikTok reported it, once its identity has been validated. */
export interface ResearchPost {
  readonly videoId: string;
  readonly url: string;
  readonly handle: string;
  readonly description: string;
  readonly viewCount: number;
  readonly likeCount: number | null;
  readonly commentCount: number | null;
  readonly shareCount: number | null;
  /** Seconds, when TikTok reported it. */
  readonly durationSeconds: number | null;
  readonly hashtags: readonly string[];
  /** Spoken audio as TikTok transcribed it. Null when absent or not granted. */
  readonly transcript: string | null;
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
    return this.search([category.label, category.id], limit);
  }

  /**
   * The best-performing recent posts matching any keywords, most watched first.
   *
   * TikTok returns matches rather than a ranking, so "top" is our sort over what
   * came back within the window, not a claim about the whole platform.
   */
  async search(keywords: readonly string[], limit: number): Promise<readonly ResearchPost[]> {
    const terms = keywords.map((word) => word.trim()).filter((word) => word !== "");
    if (!this.available || terms.length === 0) return [];

    const accessToken = await this.token();
    if (accessToken === null) return [];

    const now = new Date();
    const from = new Date(now.getTime() - WINDOW_DAYS * 24 * 3600_000);

    const response = await this.doFetch(`${BASE}/research/video/query/?fields=${QUERY_FIELDS}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          and: [{ operation: "IN", field_name: "keyword", field_values: terms }],
        },
        start_date: stamp(from),
        end_date: stamp(now),
        max_count: QUERY_COUNT,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn("tiktok research query failed", { status: response.status });
      return [];
    }

    const parsed = querySchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success || parsed.data.error?.code) {
      logger.warn("tiktok research query rejected", { error: parsed.data?.error?.message });
      return [];
    }

    return (
      (parsed.data.data?.videos ?? [])
        // `flatMap` rather than map-then-filter: a type predicate over a readonly
        // field is more trouble than the empty array it replaces.
        .flatMap((video): ResearchPost[] => {
          // Composed and then re-parsed, so what leaves here has been through the
          // same validation as a URL scraped off a page.
          const post = parseTikTokPost(
            `https://www.tiktok.com/@${video.username}/video/${video.id}`,
          );
          if (!post) return [];

          return [
            {
              videoId: post.videoId,
              url: post.url,
              handle: post.handle,
              description: video.video_description,
              viewCount: video.view_count,
              likeCount: video.like_count ?? null,
              commentCount: video.comment_count ?? null,
              shareCount: video.share_count ?? null,
              durationSeconds: video.video_duration ?? null,
              hashtags: video.hashtag_names ?? [],
              transcript: video.voice_to_text?.trim() || null,
            },
          ];
        })
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, limit)
    );
  }
}
