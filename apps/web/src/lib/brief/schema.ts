import { z } from "zod";

/**
 * The shape of a refined idea.
 *
 * A rough concept becomes a brief in two passes: read the idea back so the user
 * can see it was understood, then ask the few things that actually change what
 * gets made. The questions are generated rather than fixed, because "what hook
 * style" is the right question for a product demo and the wrong one for a
 * founder story.
 *
 * Everything crossing the model boundary is parsed. A brief that half exists
 * renders as a broken screen, so a malformed reply is rejected whole.
 */

/**
 * A question with options, wherever one is asked.
 *
 * One shape for the whole product: the refiner asks these about a rough idea and
 * the chat asks them before spending a credit on a vague brief. They render
 * through the same component, so a second shape would only be a second thing to
 * keep in step.
 */
/**
 * A length limit that trims rather than refuses.
 *
 * Every bound here used to be a hard `.max()`, and Zod rejects the whole object
 * when one field is a character over. So a single long option threw away the
 * entire analysis and the user was told their idea "came back in a shape we
 * could not read" for a brief that was almost perfect.
 *
 * These are presentation limits, not correctness ones: a 41-character option is
 * a slightly wide chip, not a wrong answer. Trimming keeps the answer and loses
 * the excess, which is the right way round.
 *
 * A trim that cuts mid-word with nothing to show for it reads as broken, not
 * wide, so a truncated value ends in an ellipsis rather than stopping cold.
 */
function text(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
      value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`,
    );
}

export const questionSchema = z.object({
  /** Short caps label above the question, e.g. "HOOK STYLE". */
  label: text(32),
  question: text(160),
  // Over four is trimmed to four. Under two is a question with nothing to pick
  // from, which is genuinely unusable, so it stays a rejection and the caller
  // drops that one question rather than the whole reply.
  options: z
    .array(text(40))
    .min(2)
    .transform((options) => options.slice(0, 4)),
});

export type PickerQuestion = z.infer<typeof questionSchema>;

/**
 * Questions are validated one at a time and the bad ones dropped.
 *
 * A model that returns three good questions and one malformed should cost us
 * the malformed one, not the conversation. Same reasoning as the memory
 * extractor, which has worked this way since it was written.
 */
const questionsField = z
  .array(z.unknown())
  .default([])
  .transform((items) => {
    const seen = new Set<string>();
    return (
      items
        .map((item) => questionSchema.safeParse(item))
        .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
        /*
         * The refiner keys an answer by its question's own label, which the
         * model writes freely with no uniqueness promised. Two questions
         * sharing one label would answer as one: picking an option for either
         * marks both settled, and the second's answer, if it differs from what
         * the first's option set actually offered, is whatever the first one's
         * label happened to be pointing at. The first occurrence wins and the
         * rest are dropped, the same rule every other malformed item here
         * follows: cost the one item, not the whole reply.
         */
        .filter((question) => (seen.has(question.label) ? false : (seen.add(question.label), true)))
        .slice(0, 4)
    );
  });

export const analysisSchema = z.object({
  topic: text(120),
  audience: text(160),
  angle: text(240),
  /**
   * May legitimately end up empty, either because the model asked nothing or
   * because nothing it asked survived. The flow treats that as "no questions
   * needed" and writes the brief, which is a better outcome than an error over
   * a step that was only ever there to sharpen things.
   */
  questions: questionsField,
});

export type IdeaAnalysis = z.infer<typeof analysisSchema>;

/** One beat of the script, with the seconds it occupies. */
export const beatSchema = z.object({
  label: text(40),
  timing: text(24),
  detail: text(400),
});

/** Same treatment as the questions: a bad beat costs its own beat, not the brief. */
const beatsField = z
  .array(z.unknown())
  .default([])
  .transform((items) =>
    items
      .map((item) => beatSchema.safeParse(item))
      .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
      .slice(0, 6),
  )
  // Two beats is the floor for something that reads as a script rather than a
  // sentence, and unlike a long string this cannot be salvaged by trimming.
  .refine((beats) => beats.length >= 2, "A brief needs at least two beats");

/**
 * A list of strings where a bad entry costs only itself.
 *
 * `z.array(text(n))` fails the whole array when one element does, which fails
 * the whole brief. A trailing empty string is a routine model artefact, so
 * `hashtags: ["fashion", ""]` was rejecting an otherwise complete brief with the
 * same "shape we could not read" this file exists to prevent. Same treatment as
 * the questions and the beats: parse each, keep what survives.
 */
function textList(max: number, keep: number) {
  return z
    .array(z.unknown())
    .default([])
    .transform((items) =>
      items
        .map((item) => text(max).safeParse(item))
        .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
        .slice(0, keep),
    );
}

export const briefSchema = z.object({
  /** The first line, which is the only part most viewers ever see. */
  hook: text(200),
  // At least one title has to survive, since the interface offers a choice of
  // them and an empty list is a section with nothing in it.
  titles: textList(120, 5).refine((titles) => titles.length >= 1, "A brief needs a title"),
  beats: beatsField,
  // Coerced and clamped: models return "15" and 15 interchangeably, and a
  // number outside the range is a rounding problem rather than a broken brief.
  durationSeconds: z.coerce
    .number()
    .transform((seconds) => Math.min(180, Math.max(5, Math.round(seconds)))),
  /** Without the leading hash, which the interface adds. */
  hashtags: textList(40, 8),
});

export type ContentBrief = z.infer<typeof briefSchema>;

/** What the user answered, as question label to chosen option. */
export const answersSchema = z.record(z.string().max(32), z.string().max(40));

export type BriefAnswers = z.infer<typeof answersSchema>;

/**
 * Finds the index of the `}` that actually closes the object opened at
 * `start`, by depth and not by position.
 *
 * `lastIndexOf("}")` was what this used to do, on the assumption that the
 * JSON is the last thing in the reply. A model that appends even a short
 * sentence after the object, and that sentence contains its own `}` for any
 * reason, a stray one, a code-like aside, moved the assumed end past the
 * real one and folded that trailing text into what was then parsed as JSON,
 * failing a reply whose JSON was perfectly fine on its own. Scanning forward
 * from the opening brace and counting depth finds the brace that actually
 * matches it, and skipping the contents of string literals is what keeps a
 * `}` inside a quoted value, ordinary text, from being counted at all.
 */
function matchingBraceIndex(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Pulls the JSON object out of a reply that may be fenced or prefaced.
 *
 * Shared by both passes rather than duplicated: the models wrap JSON in prose
 * inconsistently, and the recovery is the same either way.
 */
export function parseJsonReply<S extends z.ZodTypeAny>(
  reply: string,
  schema: S,
): { data: z.output<S> } | { reason: string } {
  const start = reply.indexOf("{");
  const end = start === -1 ? -1 : matchingBraceIndex(reply, start);
  if (start === -1 || end === -1) return { reason: "no JSON object in the reply" };

  let json: unknown;
  try {
    json = JSON.parse(reply.slice(start, end + 1));
  } catch (error) {
    return { reason: `malformed JSON: ${error instanceof Error ? error.message : "unknown"}` };
  }

  const parsed = schema.safeParse(json);
  if (parsed.success) return { data: parsed.data };

  /*
   * The reason travels back rather than being swallowed.
   *
   * This returned a bare null, so a rejected reply reached the user as "came
   * back in a shape we could not read" with nothing anywhere saying which field
   * was wrong. Diagnosing it meant guessing.
   */
  const issue = parsed.error.issues[0];
  return {
    reason: issue ? `${issue.path.join(".") || "root"}: ${issue.message}` : "did not match schema",
  };
}
