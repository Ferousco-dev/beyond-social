import { z } from "zod";

/**
 * The named shape of a post's structure: Hook, Problem, Escalation, Payoff,
 * CTA, rather than a generic list of beats. Split out of `analyse.ts` because
 * the schema and the prompt-facing description of each beat both live here,
 * and script/write.ts reads this same shape back out of an analysis.
 */

/**
 * One beat's worth of what happens on screen or in the audio, or `null` when
 * this post does not do that beat at all. A number-promise video often has no
 * escalation, and plenty of organic posts end without ever naming a call to
 * action; forcing those into an empty string would read as an extraction
 * failure rather than what the beat actually is, absent. Wrong-typed or
 * missing replies fall back the same way `hookPattern` does with `.catch()`
 * in analyse.ts: the one field goes missing rather than the whole analysis.
 */
function beat(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, max))
    .nullable()
    .default(null)
    .catch(null);
}

/**
 * Only `hook` is required, matching the top-level `hook` field on
 * `postAnalysisSchema`, which the model is never asked to omit; the other
 * four degrade to `null` exactly as often as real videos skip them.
 */
export const postStructureSchema = z.object({
  /** What actually happens in the first beat, distinct from why it grabs attention. */
  hook: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, 200)),
  /** The problem or tension the post names, if it names one. */
  problem: beat(200),
  /** How the stakes or interest build before the payoff, if they do. */
  escalation: beat(200),
  /** The answer, result or reveal, if there is one. */
  payoff: beat(200),
  /** What the post asks the viewer to do, if it asks anything. */
  cta: beat(200),
});

export type PostStructure = z.infer<typeof postStructureSchema>;

/** One line per beat, for the prompt that asks the model to fill this in. */
export const STRUCTURE_BEAT_PROMPTS: ReadonlyArray<string> = [
  "- `hook`: what actually happens in the opening beat, distinct from why it grabs attention.",
  "- `problem`: the problem or tension the post names, if it names one.",
  "- `escalation`: how the stakes or interest build before the payoff, if they do.",
  "- `payoff`: the answer, result or reveal, if there is one.",
  "- `cta`: what the post asks the viewer to do, if it asks anything.",
];

/** Labelled beats in a fixed reading order, dropping the ones a post skipped. */
export function structureBeats(
  structure: PostStructure,
): ReadonlyArray<{ label: string; detail: string }> {
  return [
    { label: "Hook", detail: structure.hook },
    { label: "Problem", detail: structure.problem },
    { label: "Escalation", detail: structure.escalation },
    { label: "Payoff", detail: structure.payoff },
    { label: "CTA", detail: structure.cta },
  ].flatMap(({ label, detail }) => (detail !== null ? [{ label, detail }] : []));
}
