import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { getJudge } from "@/lib/prompt-engine/providers";
import { isPromptEngineConfigured } from "@/lib/server-env";

import { briefSchema, parseJsonReply, type ContentBrief, type IdeaAnalysis } from "./schema";

/**
 * A second pass over the brief, by a model that did not write it.
 *
 * The writer has one job and no reason to doubt itself: it produced something
 * fluent, and fluency is exactly what a single pass cannot check. The common
 * failures are quiet ones. An answer the user gave is ignored. The beats do not
 * add up to the duration. The hook describes a video rather than being its first
 * line. None of those look wrong on their own.
 *
 * So this reads the brief against the idea and the answers, and returns a
 * corrected one. It is a review with the authority to fix, rather than a critic
 * that hands back notes nobody acts on, because a second round trip to apply
 * comments would cost what the whole pass is meant to save.
 *
 * It can only ever improve or do nothing. A review that fails, times out, or
 * comes back unreadable leaves the original brief exactly as it was: this is
 * worth a few seconds and a second call, and never worth losing a usable brief.
 */

const reviewSchema = z.object({
  /** What was actually wrong, so the decision is auditable in the logs. */
  issues: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .transform((value) => value.slice(0, 200)),
    )
    .default([])
    .transform((issues) => issues.slice(0, 6)),
  /** Absent when the brief was already right, which is a real outcome. */
  revised: briefSchema.nullable().default(null),
});

const SYSTEM =
  "You review short-form video briefs against what the creator actually asked for. You are specific and you do not rewrite for the sake of it: a brief that already works comes back untouched.";

function buildPrompt(
  idea: string,
  analysis: IdeaAnalysis,
  answers: Readonly<Record<string, string>>,
  brief: ContentBrief,
): string {
  const stated = Object.entries(answers)
    .filter(([, value]) => value.trim() !== "")
    .map(([label, value]) => `- ${label}: ${value}`)
    .join("\n");

  return [
    "Check this brief against the request it came from.",
    "",
    "Look for these, in this order:",
    "1. A choice the creator stated that the brief ignores or contradicts.",
    "2. Beats whose timings do not add up to the stated duration.",
    "3. A hook that describes the opening instead of being the opening line.",
    "4. A `prompt` that refers to the creator, the brief, or this conversation, when it is handed to a video generator on its own.",
    "5. Anything so generic it could describe any video on the subject.",
    "",
    "List what is wrong in `issues`. If anything is, return the whole corrected brief in `revised`, keeping everything that was already right.",
    "If nothing is wrong, return an empty `issues` list and `revised` as null. Do not rewrite a brief that works.",
    "",
    'Respond with JSON only: {"issues":[""],"revised":null}',
    "",
    `<request>\n${idea.slice(0, 1500)}\n</request>`,
    "",
    `<understood>\nTopic: ${analysis.topic}\nAudience: ${analysis.audience}\nAngle: ${analysis.angle}\n</understood>`,
    "",
    stated === "" ? "<choices>They stated none.</choices>" : `<choices>\n${stated}\n</choices>`,
    "",
    `<brief>\n${JSON.stringify(brief)}\n</brief>`,
  ].join("\n");
}

/**
 * Returns the brief to use: the revision when there was one, else the original.
 *
 * Never throws and never returns null, so the caller can use the result without
 * deciding what a failed review means.
 */
export async function reviewBrief(
  idea: string,
  analysis: IdeaAnalysis,
  answers: Readonly<Record<string, string>>,
  brief: ContentBrief,
): Promise<ContentBrief> {
  if (!isPromptEngineConfigured) return brief;

  try {
    const reply = await getJudge().complete({
      system: SYSTEM,
      // Zero: this is a check, and a check that varies run to run is not one.
      temperature: 0,
      json: true,
      messages: [{ role: "user", content: buildPrompt(idea, analysis, answers, brief) }],
    });

    const parsed = parseJsonReply(reply, reviewSchema);
    if (!("data" in parsed)) {
      logger.warn("brief review did not parse", { reason: parsed.reason });
      return brief;
    }

    const { issues, revised } = parsed.data;
    if (revised === null) {
      logger.info("brief review found nothing", { issues: issues.length });
      return brief;
    }

    // Logged with the reasons, so a review that starts rewriting good briefs is
    // visible rather than something users only feel.
    logger.info("brief revised after review", { issues });
    return revised;
  } catch (error) {
    logger.warn("brief review failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return brief;
  }
}
