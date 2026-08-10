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
export const questionSchema = z.object({
  /** Short caps label above the question, e.g. "HOOK STYLE". */
  label: z.string().min(1).max(32),
  question: z.string().min(1).max(160),
  options: z.array(z.string().min(1).max(40)).min(2).max(4),
});

export type PickerQuestion = z.infer<typeof questionSchema>;

export const analysisSchema = z.object({
  topic: z.string().min(1).max(120),
  audience: z.string().min(1).max(160),
  angle: z.string().min(1).max(240),
  questions: z.array(questionSchema).min(1).max(4),
});

export type IdeaAnalysis = z.infer<typeof analysisSchema>;

/** One beat of the script, with the seconds it occupies. */
export const beatSchema = z.object({
  label: z.string().min(1).max(40),
  timing: z.string().min(1).max(24),
  detail: z.string().min(1).max(400),
});

export const briefSchema = z.object({
  /** The first line, which is the only part most viewers ever see. */
  hook: z.string().min(1).max(200),
  titles: z.array(z.string().min(1).max(120)).min(1).max(5),
  beats: z.array(beatSchema).min(2).max(6),
  durationSeconds: z.number().int().min(5).max(180),
  /** Without the leading hash, which the interface adds. */
  hashtags: z.array(z.string().min(1).max(40)).max(8).default([]),
  /** The self-contained brief handed to generation. */
  prompt: z.string().min(20).max(2000),
});

export type ContentBrief = z.infer<typeof briefSchema>;

/** What the user answered, as question label to chosen option. */
export const answersSchema = z.record(z.string().max(32), z.string().max(40));

export type BriefAnswers = z.infer<typeof answersSchema>;

/**
 * Pulls the JSON object out of a reply that may be fenced or prefaced.
 *
 * Shared by both passes rather than duplicated: the models wrap JSON in prose
 * inconsistently, and the recovery is the same either way.
 */
export function parseJsonReply<S extends z.ZodTypeAny>(
  text: string,
  schema: S,
): z.output<S> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = schema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
