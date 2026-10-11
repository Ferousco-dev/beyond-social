import "server-only";

import { z } from "zod";

import { getJudge } from "@/lib/prompt-engine/providers";
import { isPromptEngineConfigured, isTrendDiscoveryConfigured } from "@/lib/server-env";

import { type TrendCategory, TREND_CATEGORY_IDS, isTrendCategory } from "../categories";
import { Firecrawl, type ScrapedPage } from "../firecrawl";
import { extractTikTokPosts, type TikTokPost } from "@/lib/tiktok/url";
import { type DiscoveredTrend, type TrendSource } from "./types";

/**
 * Trends read off the open web.
 *
 * The fallback source, used while TikTok's own API is unavailable. It searches
 * for roundups of what is working in a niche, and those pages routinely embed
 * the posts they are describing. Those embeds are the useful part: the prose is
 * one writer's opinion, but the post is the thing itself, and a creator can
 * watch it and judge for themselves.
 *
 * The extraction pass is what makes this more than a link dump. It is asked to
 * attribute each trend to one of the posts actually found on the page, and the
 * attribution is checked against that list rather than believed, so a model that
 * invents a plausible-looking TikTok URL cannot put one in the feed.
 */

/** One search per niche, deep enough to find pages that embed posts. */
const PAGES_PER_CATEGORY = 4;

/** Bounds one run: enough to fill a feed, not enough to run up a bill. */
const MAX_TRENDS_PER_CATEGORY = 6;

/** How much of each page the extractor reads. Roundups put the list up top. */
const PAGE_CHARS = 6000;

const extractedSchema = z.object({
  trends: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        description: z.string().max(400).default(""),
        prompt: z.string().min(10).max(600),
        confidence: z.number().min(0).max(1).default(0.5),
        /**
         * Named by the extractor rather than inherited from the search. A trend
         * found while searching one niche is often not about that niche, and
         * filing it there made the filters lie.
         */
        category: z.string().default("general"),
        /**
         * Which of the listed posts demonstrates this, by index. Null is a real
         * answer: format advice that no single clip owns should say so rather
         * than have a video attached to it for the sake of having one.
         */
        videoIndex: z.number().int().nullable().default(null),
      }),
    )
    .default([]),
});

function buildPrompt(
  category: string,
  pages: readonly ScrapedPage[],
  posts: readonly TikTokPost[],
): string {
  const corpus = pages
    // Fenced and labelled, so the model treats page text as data to read rather
    // than instructions to follow.
    .map(
      (page, index) =>
        `<source index="${index + 1}" url="${page.url}">\n${page.markdown.slice(0, PAGE_CHARS)}\n</source>`,
    )
    .join("\n\n");

  const catalogue = posts
    .map((post, index) => `${index}: https://www.tiktok.com/@${post.handle}/video/${post.videoId}`)
    .join("\n");

  return [
    `Read the sources below and identify what is currently working in short-form video for the "${category}" niche.`,
    "",
    "Return only formats and content patterns that a creator could actually shoot. A topic is not a trend; a repeatable format is.",
    "For each one, write a `prompt` that is a complete, self-contained brief for generating that video, specific enough to use unedited.",
    "Set `confidence` to how strongly the sources support the trend being current: 0.9 when several sources agree it is rising now, 0.3 when it is a single passing mention.",
    "",
    `Set \`category\` to the niche the trend actually belongs to, one of: ${TREND_CATEGORY_IDS.join(", ")}.`,
    `You are reading sources found by searching "${category}", but say what the trend is really about: a format that works for any subject is "general", not "${category}".`,
    "",
    posts.length > 0
      ? [
          "These TikTok posts appear in the sources:",
          catalogue,
          "",
          "Set `videoIndex` to the number of the post that demonstrates the trend, or null if none of them does.",
          "Only use a number from the list. Never write a URL of your own.",
        ].join("\n")
      : "No TikTok posts were found in these sources, so set `videoIndex` to null on every trend.",
    "",
    `Return at most ${MAX_TRENDS_PER_CATEGORY} trends. If the sources say nothing useful, return an empty list rather than inventing something.`,
    "",
    'Respond with JSON only: {"trends":[{"title":"","description":"","prompt":"","confidence":0.0,"category":"","videoIndex":null}]}',
    "",
    corpus,
  ].join("\n");
}

/** Pulls the JSON object out of a reply that may be fenced or prefaced. */
function parseExtraction(text: string): z.infer<typeof extractedSchema> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return { trends: [] };
  try {
    const parsed = extractedSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : { trends: [] };
  } catch {
    return { trends: [] };
  }
}

export class FirecrawlTrendSource implements TrendSource {
  readonly id = "firecrawl";

  constructor(private readonly firecrawl: Firecrawl = new Firecrawl()) {}

  get available(): boolean {
    return isTrendDiscoveryConfigured && isPromptEngineConfigured;
  }

  async discover(category: TrendCategory): Promise<readonly DiscoveredTrend[]> {
    const pages = await this.firecrawl.search(
      `trending TikTok videos ${category.label} this month examples`,
      PAGES_PER_CATEGORY,
    );
    if (pages.length === 0) return [];

    const posts = extractTikTokPosts(pages.map((page) => page.markdown).join("\n"));

    // Temperature 0 so the same sources extract the same trends, which also
    // makes the call eligible for the gateway's response cache.
    const reply = await getJudge().complete({
      system:
        "You extract structured, actionable short-form video trends from web sources. You never invent a trend that the sources do not support, and you never invent a URL.",
      messages: [{ role: "user", content: buildPrompt(category.label, pages, posts) }],
      temperature: 0,
      json: true,
    });

    const { trends } = parseExtraction(reply);

    return trends.slice(0, MAX_TRENDS_PER_CATEGORY).map((trend) => {
      // Resolved by index against the posts we parsed ourselves, so the URL that
      // reaches the database is one this process built.
      const post = trend.videoIndex !== null ? (posts[trend.videoIndex] ?? null) : null;

      return {
        title: trend.title,
        description: trend.description,
        prompt: trend.prompt,
        confidence: trend.confidence,
        // The searched niche is the fallback, not the default: a model that
        // invents a category must not put an unfilterable value in the table.
        category: isTrendCategory(trend.category) ? trend.category : category.id,
        videoUrl: post?.url ?? null,
        authorHandle: post?.handle ?? null,
        // Nothing here reports views, and a number read out of marketing copy is
        // not a measurement.
        viewCount: null,
        sourceUrl: pages[0]?.url ?? "",
        sourceName: pages[0]?.title ?? "",
      };
    });
  }
}
