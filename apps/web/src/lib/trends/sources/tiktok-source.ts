import "server-only";

import { z } from "zod";

import { getJudge } from "@/lib/prompt-engine/providers";
import { isPromptEngineConfigured } from "@/lib/server-env";

import { type TrendCategory } from "../categories";
import { TikTokResearchClient, type ResearchPost } from "@/lib/tiktok/research";
import { type DiscoveredTrend, type TrendSource } from "./types";

/**
 * Trends from TikTok itself.
 *
 * The posts are real and so are the view counts, which is what this source is
 * for. What TikTok does not give us is a brief: a video description is a caption
 * written for viewers, not instructions for making something like it. So the
 * posts are still read by the extraction pass, but it is now describing footage
 * that demonstrably performed rather than inferring from an article.
 *
 * Each returned trend keeps the post it was drawn from, so the feed can show the
 * clip and the count next to the brief and the user can judge both.
 */

/** Enough posts per niche to see a pattern, few enough to stay one call. */
const POSTS_PER_CATEGORY = 12;

const extractedSchema = z.object({
  trends: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        description: z.string().max(400).default(""),
        prompt: z.string().min(10).max(600),
        confidence: z.number().min(0).max(1).default(0.5),
        /** Which post it came from, by index into the list given. */
        postIndex: z.number().int(),
      }),
    )
    .default([]),
});

function buildPrompt(category: string, posts: readonly ResearchPost[]): string {
  const catalogue = posts
    // Fenced and labelled, so the model treats captions as data to read rather
    // than instructions to follow. Captions are written by strangers.
    .map((post, index) =>
      [
        `<post index="${index}" views="${post.viewCount}"${post.durationSeconds !== null ? ` seconds="${post.durationSeconds}"` : ""}>`,
        post.description.slice(0, 500),
        // The transcript, when TikTok gave us one. A caption says what the
        // post is filed under; the spoken words say how it actually runs, so
        // a format read from them is worth more than one read from a slogan.
        post.transcript ? `\nSpoken: ${post.transcript.slice(0, 800)}` : "",
        "</post>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  return [
    `These are among the most watched "${category}" posts on TikTok in the last month, with their view counts.`,
    "",
    "Say what format each one is using, in a way a creator could repeat with their own subject. A topic is not a trend; a repeatable format is.",
    "Write `prompt` as a complete, self-contained brief for generating a video in that format, specific enough to use unedited.",
    "Set `confidence` from how well the post performed relative to the others here, and from how clearly the caption shows what the format is: 0.9 for a top performer whose format is obvious, 0.3 when the caption says almost nothing.",
    "Set `postIndex` to the post the trend is drawn from.",
    "",
    "Skip posts whose caption does not reveal a repeatable format. Returning four solid trends is better than twelve padded ones.",
    "",
    'Respond with JSON only: {"trends":[{"title":"","description":"","prompt":"","confidence":0.0,"postIndex":0}]}',
    "",
    catalogue,
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

export class TikTokTrendSource implements TrendSource {
  readonly id = "tiktok-research";

  constructor(private readonly client: TikTokResearchClient = new TikTokResearchClient()) {}

  get available(): boolean {
    return this.client.available && isPromptEngineConfigured;
  }

  async discover(category: TrendCategory): Promise<readonly DiscoveredTrend[]> {
    const posts = await this.client.topPosts(category, POSTS_PER_CATEGORY);
    if (posts.length === 0) return [];

    const reply = await getJudge().complete({
      system:
        "You describe the repeatable format behind a short-form video, from its caption and how it performed. You never invent a trend the posts do not support.",
      messages: [{ role: "user", content: buildPrompt(category.label, posts) }],
      temperature: 0,
      json: true,
    });

    const { trends } = parseExtraction(reply);

    return trends
      .map((trend): DiscoveredTrend | null => {
        // Resolved by index against posts this process fetched, so a model that
        // makes up an index simply drops out rather than inventing a source.
        const post = posts[trend.postIndex];
        if (!post) return null;

        return {
          title: trend.title,
          description: trend.description,
          prompt: trend.prompt,
          confidence: trend.confidence,
          // The searched niche is the category here, unlike the web source: the
          // query asked TikTok for this niche and TikTok matched it.
          category: category.id,
          videoUrl: post.url,
          authorHandle: post.handle,
          viewCount: post.viewCount,
          sourceUrl: post.url,
          sourceName: `@${post.handle} on TikTok`,
        };
      })
      .filter((trend): trend is DiscoveredTrend => trend !== null);
  }
}
