import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { getJudge } from "@/lib/prompt-engine/providers";
import { isPromptEngineConfigured, isTrendDiscoveryConfigured } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/service";

import { Firecrawl, type ScrapedPage } from "./firecrawl";
import { isTrendCategory, SEARCHABLE_CATEGORIES, TREND_CATEGORY_IDS } from "./categories";

/**
 * Trend discovery.
 *
 * Firecrawl fetches pages about what is currently working in short-form video;
 * an extraction pass turns that prose into structured, actionable trends. The
 * extraction step is what makes this useful rather than a link dump: a trend
 * the user cannot immediately turn into a brief is trivia.
 *
 * Every discovered row keeps its source URL, so a claim can be checked. We do
 * not attach view counts, because we have no way to measure them and an
 * invented number is worse than no number.
 */

/** One search per category, so a niche with nothing new simply returns nothing. */
const PAGES_PER_CATEGORY = 3;

/** Bounds one run: enough to fill a feed, not enough to run up a bill. */
const MAX_TRENDS_PER_CATEGORY = 6;

const extractedSchema = z.object({
  trends: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        description: z.string().max(400).default(""),
        prompt: z.string().min(10).max(600),
        confidence: z.number().min(0).max(1).default(0.5),
        /**
         * Named by the extractor rather than inherited from the search.
         * A trend found while searching one niche is often not about that
         * niche, and filing it there made the filters lie.
         */
        category: z.string().default("general"),
      }),
    )
    .default([]),
});

export interface DiscoveryResult {
  readonly sources: number;
  readonly discovered: number;
  readonly ok: boolean;
  readonly error?: string;
}

function extractionPrompt(category: string, pages: readonly ScrapedPage[]): string {
  const corpus = pages
    // Fenced and labelled, so the model treats page text as data to read rather
    // than instructions to follow.
    .map(
      (page, index) =>
        `<source index="${index + 1}" url="${page.url}">\n${page.markdown.slice(0, 6000)}\n</source>`,
    )
    .join("\n\n");

  return [
    `Read the sources below and identify what is currently working in short-form video for the "${category}" niche.`,
    "",
    "Return only formats and content patterns that a creator could actually shoot. A topic is not a trend; a repeatable format is.",
    "For each one, write a `prompt` that is a complete, self-contained brief for generating that video, specific enough to use unedited.",
    "Set `confidence` to how strongly the sources support the trend being current: 0.9 when several sources agree it is rising now, 0.3 when it is a single passing mention.",
    "",
    `Set \`category\` to the niche the trend actually belongs to, one of: ${TREND_CATEGORY_IDS.join(", ")}.`,
    `You are reading sources found by searching "${category}", but say what the trend is really about: a format that works for any subject is "general", not "${category}".`,
    `Return at most ${MAX_TRENDS_PER_CATEGORY} trends. If the sources say nothing useful, return an empty list rather than inventing something.`,
    "",
    'Respond with JSON only: {"trends":[{"title":"","description":"","prompt":"","confidence":0.0,"category":""}]}',
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

/**
 * Runs one discovery pass across every category.
 *
 * Records the run either way: a scraper that silently fails looks exactly like
 * "nothing is trending", and those need to be distinguishable.
 */
export async function discoverTrends(): Promise<DiscoveryResult> {
  if (!isTrendDiscoveryConfigured) {
    return { sources: 0, discovered: 0, ok: false, error: "Firecrawl is not configured" };
  }
  if (!isPromptEngineConfigured) {
    return { sources: 0, discovered: 0, ok: false, error: "No model is configured for extraction" };
  }

  const service = createServiceClient();
  const { data: run } = await service
    .from("trend_runs")
    .insert({} as never)
    .select("id")
    .single();
  const runId = (run as { id?: number } | null)?.id;

  const firecrawl = new Firecrawl();
  const judge = getJudge();
  let sources = 0;
  let discovered = 0;
  let failure: string | undefined;

  try {
    for (const category of SEARCHABLE_CATEGORIES) {
      const pages = await firecrawl.search(
        `trending short-form video formats ${category.label} TikTok Reels this month`,
        PAGES_PER_CATEGORY,
      );
      if (pages.length === 0) continue;
      sources += pages.length;

      // Temperature 0 so the same sources extract the same trends, which also
      // makes the call eligible for the gateway's response cache.
      const reply = await judge.complete({
        system:
          "You extract structured, actionable short-form video trends from web sources. You never invent a trend that the sources do not support.",
        messages: [{ role: "user", content: extractionPrompt(category.label, pages) }],
        temperature: 0,
        json: true,
      });
      const { trends } = parseExtraction(reply);
      if (trends.length === 0) continue;

      const rows = trends.slice(0, MAX_TRENDS_PER_CATEGORY).map((trend) => ({
        title: trend.title,
        description: trend.description,
        // The searched niche is the fallback, not the default: a model that
        // invents a category must not put an unfilterable value in the table.
        category: isTrendCategory(trend.category) ? trend.category : category.id,
        source_url: pages[0]?.url ?? "",
        source_name: pages[0]?.title ?? "",
        prompt: trend.prompt,
        confidence: trend.confidence,
        discovered_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 24 * 3600_000).toISOString(),
      }));

      // Upsert on (title, source_url) so a repeat run refreshes a trend rather
      // than duplicating it. Must match the unique index exactly.
      const { error } = await service
        .from("trends")
        .upsert(rows as never, { onConflict: "title,source_url", ignoreDuplicates: false });
      if (error) throw new Error(error.message);
      discovered += rows.length;
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    logger.error("trend discovery failed", { error: failure });
  }

  if (runId !== undefined) {
    await service
      .from("trend_runs")
      .update({
        finished_at: new Date().toISOString(),
        sources,
        discovered,
        ok: failure === undefined,
        error: failure ?? null,
      } as never)
      .eq("id", runId);
  }

  return { sources, discovered, ok: failure === undefined, error: failure };
}
