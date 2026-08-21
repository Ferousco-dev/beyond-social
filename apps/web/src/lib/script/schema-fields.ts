import { z } from "zod";

/**
 * The value helpers every block of the script schema is built from.
 *
 * Pulled out on their own so `schema.ts`, `schema-metadata.ts`, and
 * `schema-generation.ts` can share one definition of "a line of text" and "a
 * short list of them" without importing each other.
 */

/**
 * Trims rather than refuses, for the same reason the brief schema does: a line
 * a few characters over is a wide box, not a wrong answer, and rejecting the
 * whole script over one costs the user everything else in it.
 */
export function text(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, max));
}

/** Optional in the reply, empty string when the model leaves it out. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .default("")
    .transform((value) => value.slice(0, max));
}

/**
 * A capped list of short lines, each validated on its own so one malformed
 * item costs itself rather than the whole list. Shared by `mechanics.retention`
 * and `generationInstructions.negativePrompts`, which are the same shape: a
 * handful of short, independent reasons.
 */
export function textList(max: number, cap: number) {
  return z
    .array(z.unknown())
    .default([])
    .transform((items) =>
      items
        .map((item) => text(max).safeParse(item))
        .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
        .slice(0, cap),
    );
}
