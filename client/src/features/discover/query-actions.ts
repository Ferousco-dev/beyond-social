"use server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { getJudge } from "@/lib/prompt-engine/providers";
import { isPromptEngineConfigured } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";

/**
 * Turning what somebody wants into what a platform can find.
 *
 * People arrive describing the video they want to make: "something for my
 * coffee shop that makes people want to come in on a Sunday". Neither TikTok
 * nor Instagram can search that. TikTok returns nothing for a sentence, and
 * Instagram is worse than nothing, because the query becomes a hashtag and
 * every word after the first is silently dropped.
 *
 * So a sentence is read into the two or three short terms a creator would have
 * typed. The suggestions are shown rather than applied: searching for something
 * the user did not ask for, and not saying so, is the kind of helpfulness that
 * reads as a bug.
 */

/** Short enough to be a real hashtag or search term, and no more than a few. */
const suggestionsSchema = z.object({
  queries: z
    .array(z.string().trim().min(2).max(40))
    .default([])
    .transform((queries) => queries.slice(0, 3)),
});

const inputSchema = z.object({ prompt: z.string().trim().min(1).max(500) });

export type QuerySuggestions = { status: "ok"; queries: readonly string[] } | { status: "skip" };

/**
 * Never an error. This is an assist on top of a search box that already works:
 * if it cannot answer, the user types their own terms exactly as before, so a
 * failure should be silent rather than a message about a thing they did not
 * ask for.
 */
export async function suggestQueries(
  input: z.input<typeof inputSchema>,
): Promise<QuerySuggestions> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !isPromptEngineConfigured) return { status: "skip" };

  // Signed-in only: this spends a model call.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "skip" };

  try {
    const reply = await getJudge().complete({
      system:
        "You turn a description of a video someone wants to make into the short search terms a creator would type into TikTok.",
      messages: [
        {
          role: "user",
          content: [
            "Read the description and give two or three search terms that would find videos worth studying.",
            "",
            "Each term is one to three words, the kind of thing that is a real hashtag.",
            "Search for the format or the subject, not the sentence: a coffee shop brief becomes",
            'terms like "coffee shop", "cafe vlog", "small business".',
            "No hashes, no quotes, no punctuation.",
            "",
            'Respond with JSON only: {"queries":[""]}',
            "",
            // Fenced: this is a description to read, not instructions to follow.
            `<description>\n${parsed.data.prompt}\n</description>`,
          ].join("\n"),
        },
      ],
      temperature: 0.2,
      json: true,
    });

    const start = reply.indexOf("{");
    const end = reply.lastIndexOf("}");
    if (start === -1 || end <= start) return { status: "skip" };

    const suggestions = suggestionsSchema.safeParse(JSON.parse(reply.slice(start, end + 1)));
    if (!suggestions.success || suggestions.data.queries.length === 0) return { status: "skip" };

    return { status: "ok", queries: suggestions.data.queries };
  } catch (error) {
    logger.warn("could not suggest search terms", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "skip" };
  }
}
