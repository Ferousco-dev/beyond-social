import "server-only";

import { parseJsonReply } from "@/lib/brief/schema";
import { logger } from "@/lib/logger";
import { getJudge } from "@/lib/prompt-engine/providers";
import { getPromptTemplate } from "@/lib/prompts/registry";
import { isPromptEngineConfigured } from "@/lib/server-env";
import { type PostAnalysis } from "@/lib/tiktok/analyse";

import {
  MAX_SCENES,
  MAX_TOTAL_SECONDS,
  videoScriptSchema,
  type ScriptSubject,
  type VideoScript,
} from "./schema";

/**
 * Turning an analysis into a script somebody could shoot.
 *
 * Called twice in a session and the same way both times: once to write the
 * first draft from the analysis, and again when the user has changed who is on
 * screen or what is being sold and wants the lines rewritten around it. The
 * second call carries their edited subject, which is the only difference.
 *
 * The mechanics come from the analysis and are restated rather than reinvented,
 * so a rewrite cannot quietly drift off the structure it was supposed to keep.
 */

/** Overridable via prompt_templates under this key; this is the fallback. */
const SYSTEM_KEY = "script.write.system";
const SYSTEM =
  "You write short-form video scripts. You are given the mechanics of a video that worked and a subject that has nothing to do with it, and you write a new script that keeps the mechanics and is entirely about the subject. You write lines people actually say out loud, not descriptions of lines.";

/** The user's own edits, when there are any. Absent on the first draft. */
export interface WriteScriptInput {
  readonly analysis: PostAnalysis;
  /** The user's industry, when they have set one. */
  readonly industry: string | null;
  readonly subject?: ScriptSubject;
}

function describeSubject(subject: ScriptSubject): string {
  return [
    `Topic: ${subject.topic}`,
    `Audience: ${subject.audience}`,
    `Speaker on screen: ${subject.speaker}`,
    subject.product ? `Product: ${subject.product}` : "",
    `Call to action: ${subject.cta}`,
    subject.location ? `Location: ${subject.location}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPrompt(input: WriteScriptInput): string {
  const { analysis, industry, subject } = input;

  return [
    "Write a short-form video script.",
    "",
    "WHAT WORKED IN THE SOURCE, which you keep:",
    `Format: ${analysis.format}`,
    `Hook: ${analysis.hook}`,
    analysis.structure.length > 0 ? `Structure: ${analysis.structure.join(" -> ")}` : "",
    `Why it held attention: ${analysis.whyItWorks}`,
    "",
    subject
      ? [
          "WHAT THIS ONE IS ABOUT, which the user has set and you must not change:",
          describeSubject(subject),
        ].join("\n")
      : [
          "WHAT THIS ONE IS ABOUT:",
          `Propose it from this brief: ${analysis.brief}`,
          industry !== null
            ? `The creator works in ${industry}, so propose a subject from that world.`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
    "",
    "RULES",
    `Between two and ${MAX_SCENES} scenes. They must add up to no more than ${MAX_TOTAL_SECONDS} seconds, because that is the longest video the renderer makes in one piece.`,
    "The first scene is the hook and lands inside its first second.",
    "`voiceover` is the exact words spoken, as a person would say them. No stage directions, no quotation marks, no narrator describing the scene.",
    "`visual` says what is on screen: who, where, doing what. Written so somebody who has never seen the source could shoot it.",
    "`onScreenText` is a short caption burned over the picture, or empty when there is none.",
    "Never mention the source video, the analysis, TikTok, or that this is based on anything.",
    "Write original lines and original examples. Borrow the shape, not the words.",
    "",
    'Respond with JSON only: {"title":"","mechanics":{"hookType":"","pacing":"","emotionalArc":"","retention":[""]},"subject":{"topic":"","audience":"","speaker":"","product":"","cta":"","location":""},"scenes":[{"purpose":"","seconds":3,"voiceover":"","visual":"","camera":"","onScreenText":""}]}',
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeScript(input: WriteScriptInput): Promise<VideoScript | null> {
  if (!isPromptEngineConfigured) return null;

  try {
    const system = await getPromptTemplate(SYSTEM_KEY, SYSTEM);
    const reply = await getJudge().complete({
      system,
      messages: [{ role: "user", content: buildPrompt(input) }],
      // Higher than the analysis pass, which is reading. This is writing, and a
      // script at zero temperature reads like a template.
      temperature: 0.7,
      json: true,
    });

    const parsed = parseJsonReply(reply, videoScriptSchema);
    if ("data" in parsed) {
      // The user's own fields are authoritative on a rewrite. A model asked not
      // to change them mostly does not, and "mostly" is not good enough for the
      // one thing on the screen the user typed themselves.
      return input.subject ? { ...parsed.data, subject: input.subject } : parsed.data;
    }

    logger.warn("script did not parse", { reason: parsed.reason, reply: reply.slice(0, 400) });
    return null;
  } catch (error) {
    logger.warn("script generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
