import "server-only";

import { z } from "zod";

import { questionSchema, type PickerQuestion } from "@/lib/brief/schema";
import { logger } from "@/lib/logger";
import { getJudge } from "@/lib/prompt-engine/providers";
import { isPromptEngineConfigured } from "@/lib/server-env";

import { type Classification } from "./intent";

/**
 * Asking before spending.
 *
 * The decision to ask is made here, in code, and never by the model. Models
 * recognise ambiguity perfectly well when you ask them to judge it, and then ask
 * a clarifying question in almost no normal replies; retrieved context makes it
 * worse, because supporting passages read as evidence the request was already
 * answerable. This turn hands the model memories, a summary, related
 * conversations and retrieved chunks, so "please ask if unsure" in a system
 * prompt would be the least reliable possible gate.
 *
 * So the model is asked only to write good questions. Whether to ask at all is
 * decided from the classifier's own confidence and from slots we can check.
 *
 * Only `create` is gated. Answering a question costs nothing, an adjustment is
 * cheap to redo and reads against a video already on screen, but a new render
 * spends a credit that does not come back.
 */

/**
 * Below this, a `create` is not trusted to spend a credit on its own.
 *
 * Deliberately low. The failure mode of clarification is asking about
 * everything, and a question in front of a request that was perfectly clear is
 * more annoying than a render that missed slightly.
 */
const CONFIDENCE_FLOOR = 0.55;

/** Under this many characters a brief is too thin to render faithfully. */
const THIN_PROMPT_CHARS = 25;

/** The label doubles as the key an answer is filed under. */
export type ClarifyQuestion = PickerQuestion;

/**
 * Why this turn is being held.
 *
 * Returned rather than kept internal so the interface can say which it was.
 * "Two quick questions" in front of a request the user thought was perfectly
 * clear reads as the product being difficult; naming the reason turns the same
 * pause into the product being careful with their money.
 */
export type ClarifyReason = "unsure" | "thin";

const questionsSchema = z.object({
  questions: z.array(questionSchema).max(3).default([]),
});

export interface ClarifyContext {
  readonly classification: Classification;
  readonly prompt: string;
  /** True when the turn already carries photos, voice or footage. */
  readonly hasAttachments: boolean;
  /** True when the caller has already answered or skipped once this turn. */
  readonly alreadyAsked: boolean;
}

/**
 * Whether this turn is worth a question, and which rule caught it.
 *
 * Every branch is checkable without a model. An unsure classification and a
 * one-line brief are both things we can see, and neither needs judgement to
 * recognise. Null means go ahead and spend.
 */
export function needsClarification(context: ClarifyContext): ClarifyReason | null {
  const { classification, prompt, hasAttachments, alreadyAsked } = context;

  // One round, ever. A second pass would let a model that keeps finding things
  // to ask about hold a paid action hostage indefinitely.
  if (alreadyAsked) return null;

  // A question or an adjustment costs nothing to get slightly wrong.
  if (classification.intent !== "create") return null;

  if (classification.confidence < CONFIDENCE_FLOOR) return "unsure";

  /*
   * A thin brief with nothing attached is the expensive kind of vague. The same
   * words alongside a photo are not: the picture carries most of the direction,
   * and asking then reads as not having looked at what was sent.
   */
  return prompt.trim().length < THIN_PROMPT_CHARS && !hasAttachments ? "thin" : null;
}

/**
 * What the assistant says before the questions appear.
 *
 * Written here beside the rule that fired, rather than in the component, so the
 * sentence and the reason cannot drift apart. Not generated: this is a fixed
 * fact about what just happened, and a model call to phrase it would add a
 * round trip to the one moment the user is already waiting.
 */
export const CLARIFY_FRAMING: Readonly<Record<ClarifyReason, string>> = {
  unsure:
    "I want to make sure I have this right before I use a credit on it. Two quick questions, or skip and I will go with my read of it.",
  thin: "That gives me a lot of room, and a render costs a credit whether or not it lands. Tell me a little more, or skip and I will make my own call.",
};

function buildPrompt(prompt: string, classification: Classification): string {
  const known = [
    classification.aspectRatio ? `Shape: ${classification.aspectRatio}` : "",
    classification.durationSeconds ? `Length: ${classification.durationSeconds}s` : "",
  ].filter(Boolean);

  return [
    "Someone asked for a video and the request is not specific enough to render faithfully.",
    "Ask at most two questions whose answers would visibly change what gets made.",
    "",
    "Each needs a short caps label, the question, and two to four concrete options.",
    "Ask about what should be on screen: the subject, the setting, who it is for, the feel.",
    "Never ask about anything already stated, and never ask them to repeat what they said.",
    known.length > 0 ? `Already known, so do not ask about these: ${known.join(", ")}` : "",
    "",
    "If the request is actually clear enough to make something reasonable from, return an empty list.",
    "",
    'Respond with JSON only: {"questions":[{"label":"","question":"","options":[""]}]}',
    "",
    // Fenced, so the model treats the request as the thing to reason about
    // rather than as instructions addressed to it.
    `<request>\n${prompt.slice(0, 2000)}\n</request>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Writes the questions.
 *
 * Returns an empty list when the model decides the request was clear after all,
 * which is a real answer: the gate above is deliberately blunt, and this is the
 * cheap second opinion that stops a blunt rule interrogating somebody over a
 * brief that was fine.
 */
export async function buildClarification(
  prompt: string,
  classification: Classification,
): Promise<readonly ClarifyQuestion[]> {
  if (!isPromptEngineConfigured) return [];

  try {
    const reply = await getJudge().complete({
      system:
        "You ask short, concrete questions that make a vague video request specific. You never ask more than two, and you never ask about something the person already told you.",
      messages: [{ role: "user", content: buildPrompt(prompt, classification) }],
      temperature: 0.3,
      json: true,
    });

    const start = reply.indexOf("{");
    const end = reply.lastIndexOf("}");
    if (start === -1 || end <= start) return [];

    const parsed = questionsSchema.safeParse(JSON.parse(reply.slice(start, end + 1)));
    return parsed.success ? parsed.data.questions : [];
  } catch (error) {
    // A failure here must not block the render. The point of asking is to spend
    // credits well, and refusing to spend them at all because a helper call
    // failed is a worse outcome than a slightly vague video.
    logger.warn("could not build clarification", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Folds the answers into the brief, so the render sees one directed prompt. */
export function applyAnswers(prompt: string, answers: Readonly<Record<string, string>>): string {
  const stated = Object.entries(answers)
    .filter(([, value]) => value.trim() !== "")
    .map(([label, value]) => `${label.toLowerCase()}: ${value.trim()}`);

  return stated.length === 0 ? prompt : `${prompt}\n\n${stated.join("\n")}`;
}
