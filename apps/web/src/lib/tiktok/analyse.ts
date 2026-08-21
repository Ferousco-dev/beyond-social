import "server-only";

import { z } from "zod";

import { parseJsonReply } from "@/lib/brief/schema";
import { HOOK_PATTERN_DESCRIPTIONS, HOOK_PATTERNS } from "@/lib/hooks/taxonomy";
import { logger } from "@/lib/logger";
import { getJudge } from "@/lib/prompt-engine/providers";
import { getPromptTemplate } from "@/lib/prompts/registry";
import { isPromptEngineConfigured } from "@/lib/server-env";
import { fenceSafe } from "@/lib/text/fence";

/**
 * Working out why a post worked, so a new video can borrow the reason.
 *
 * "Use as inspiration" used to hand the generator one sentence: make a video in
 * the style of this TikTok by @someone, plus the caption and a link. The model
 * cannot open a link, so in practice it received a handle and a caption and
 * invented the rest. This reads the signals we actually have and turns them into
 * a format a creator could repeat.
 *
 * WE HAVE NOT SEEN THE VIDEO. No API of TikTok's hands over the file, so there
 * are no shots, no framing and no edit to read. What we get is the caption, the
 * hashtags, the length, the engagement, and sometimes TikTok's own transcript of
 * the speech. The prompt says so in those words, because a model given a
 * transcript will otherwise happily describe camera moves it never saw, and a
 * confident invented shot list is worse than an honest thin one.
 */

/**
 * Exported because the script writer takes an analysis back from the browser:
 * the sheet holds it while the user reads it, and validating what comes back is
 * the same rule every other boundary here follows.
 */
export const postAnalysisSchema = z.object({
  /** The repeatable pattern, named in a few words. */
  format: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, 80)),
  /** How the first seconds earn attention. */
  hook: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, 200)),
  /**
   * The hook, named against a fixed list rather than left as free text. Two
   * hooks that read nothing alike, "nobody tells you this" and "here's the
   * secret nobody warns you about", are the same pattern once tagged, which is
   * what makes "give me a curiosity gap instead" a request with a field to
   * land in rather than a sentence someone has to re-read every hook to judge.
   * An unclear reply falls to `other` rather than a guessed pattern, which
   * would be worse for anything correlating outcomes against it later.
   */
  hookPattern: z.enum(HOOK_PATTERNS).catch("other"),
  /** The beats in order, as far as the signals support. */
  structure: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .transform((value) => value.slice(0, 160)),
    )
    .default([])
    .transform((beats) => beats.slice(0, 6)),
  /** Why this earned attention, grounded in what we were given. */
  whyItWorks: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, 400)),
  /**
   * The brief to hand the generator. This is the output that matters: everything
   * above exists so the user can judge whether this is worth rendering.
   */
  brief: z
    .string()
    .trim()
    .min(20)
    .transform((value) => value.slice(0, 1200)),
  /** How much of this is read from evidence rather than inferred. */
  confidence: z.enum(["high", "medium", "low"]).catch("low"),
});

export type PostAnalysis = z.infer<typeof postAnalysisSchema>;

export interface AnalysablePost {
  readonly handle: string;
  readonly caption: string;
  readonly viewCount: number | null;
  readonly likeCount: number | null;
  readonly commentCount: number | null;
  readonly shareCount: number | null;
  readonly durationSeconds: number | null;
  readonly hashtags: readonly string[];
  readonly transcript: string | null;
}

/** Overridable via prompt_templates under this key; this is the fallback. */
const SYSTEM_KEY = "discover.analysis.system";
const SYSTEM =
  "You work out the repeatable format behind a short-form video from the little that is measurable about it. You are rigorous about the line between what you were told and what you are guessing, and you never describe footage you have not seen.";

/** Only the signals that are actually present, each labelled as what it is. */
function evidence(post: AnalysablePost): string {
  const lines = [
    `Account: @${post.handle}`,
    post.caption ? `Caption: ${post.caption.slice(0, 500)}` : "",
    post.hashtags.length > 0 ? `Hashtags: ${post.hashtags.slice(0, 15).join(", ")}` : "",
    post.durationSeconds !== null ? `Length: ${post.durationSeconds} seconds` : "",
    post.viewCount !== null ? `Views: ${post.viewCount.toLocaleString("en-US")}` : "",
    post.likeCount !== null ? `Likes: ${post.likeCount.toLocaleString("en-US")}` : "",
    post.commentCount !== null ? `Comments: ${post.commentCount.toLocaleString("en-US")}` : "",
    post.shareCount !== null ? `Shares: ${post.shareCount.toLocaleString("en-US")}` : "",
    post.transcript
      ? `Spoken words, as TikTok transcribed them:\n${post.transcript.slice(0, 2000)}`
      : "",
  ].filter(Boolean);

  return lines.join("\n");
}

function buildPrompt(post: AnalysablePost, industry: string | null): string {
  const hasTranscript = post.transcript !== null && post.transcript !== "";

  return [
    "Below is everything measurable about one TikTok post. Work out the repeatable format behind it.",
    "",
    "You have NOT seen the video. There is no footage, no shot list and no edit available to you.",
    hasTranscript
      ? "You do have the spoken words, so what is said and in what order is evidence. How it was shot is not."
      : "There is no transcript, so you know nothing about what was said. Say less rather than inventing it.",
    "Never describe a camera move, a cut, a location or an on-screen graphic as though you observed it.",
    "Where you are inferring from the caption or the numbers, phrase it as the pattern, not as a description of the video.",
    "",
    "Set `confidence` honestly: high only with a transcript and a caption that agree, low when you have little more than a caption.",
    "",
    "Classify `hookPattern` against exactly this list, picking the closest one rather than inventing your own:",
    HOOK_PATTERNS.map((pattern) => `- ${pattern}: ${HOOK_PATTERN_DESCRIPTIONS[pattern]}`).join(
      "\n",
    ),
    "",
    industry !== null
      ? `Write \`brief\` for a creator in the ${industry} industry: the same format, applied to their own subject.`
      : "Write `brief` so the same format can be applied to a different subject.",
    "`brief` is handed straight to a video generator, so it must describe what should be on screen and must not mention this post, this analysis, or TikTok.",
    "",
    'Respond with JSON only: {"format":"","hook":"","hookPattern":"other","structure":[""],"whyItWorks":"","brief":"","confidence":"low"}',
    "",
    // Fenced and labelled: a caption is a stranger's text and a transcript is a
    // stranger's speech, so both are data to read rather than instructions.
    `<post>\n${fenceSafe(evidence(post))}\n</post>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function analysePost(
  post: AnalysablePost,
  industry: string | null,
): Promise<PostAnalysis | null> {
  if (!isPromptEngineConfigured) return null;

  try {
    const system = await getPromptTemplate(SYSTEM_KEY, SYSTEM);
    const reply = await getJudge().complete({
      system,
      messages: [{ role: "user", content: buildPrompt(post, industry) }],
      // Low but not zero: this is analysis, and the brief still has to read like
      // something a person would want to shoot.
      temperature: 0.3,
      json: true,
    });

    const parsed = parseJsonReply(reply, postAnalysisSchema);
    if ("data" in parsed) return parsed.data;

    logger.warn("post analysis did not parse", {
      reason: parsed.reason,
      reply: reply.slice(0, 400),
    });
    return null;
  } catch (error) {
    logger.warn("post analysis failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
