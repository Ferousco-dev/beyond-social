import { z } from "zod";

import { optionalText, text, textList } from "./schema-fields";
import { generationInstructionsSchema } from "./schema-generation";
import { metadataSchema } from "./schema-metadata";

/**
 * A shot-by-shot script, written from a post we analysed.
 *
 * "Use this brief" used to hand the composer a paragraph. A paragraph is a
 * description of a video, and a video model given a description invents the
 * beats, the lines and the cuts itself, differently every run. What made the
 * source post work was its shape: where the hook lands, how often the picture
 * changes, what is actually said. None of that survives a paragraph.
 *
 * So the analysis becomes a script instead. Two halves, deliberately separate:
 * the mechanics that made the original work, which the user reads but does not
 * edit, and the content, which is entirely theirs. Keeping them apart is what
 * lets somebody change a web designer into a restaurant owner without losing
 * the reason the video held attention.
 *
 * Nothing here is a copy of the source. The mechanics are a pattern, the
 * content is the user's own subject, and the lines are written fresh.
 *
 * Five blocks in total, split across three files so none of them balloons:
 * what kind of video this is (`schema-metadata.ts`), why the source worked
 * (`mechanicsSchema`, below), what this one says (`subjectSchema` and
 * `sceneSchema`, below), and how to render it (`schema-generation.ts`).
 */

/**
 * The mechanics, read from the source and held fixed.
 *
 * Presented as reference rather than as fields. These are the answer to "why
 * did that video work", and a user editing them is editing the one thing they
 * came here to borrow.
 */
export const mechanicsSchema = z.object({
  /** Named in a few words, e.g. "Curiosity gap". */
  hookType: text(60),
  /** How fast it moves, and how often the picture changes. */
  pacing: text(120),
  /** Where the feeling goes, e.g. "Curiosity to concern to relief". */
  emotionalArc: text(120),
  /** What keeps someone watching: open loops, pattern interrupts, delayed payoff. */
  retention: textList(120, 5),
});

export type ScriptMechanics = z.infer<typeof mechanicsSchema>;

/**
 * What the video is about, which is the half the user changes.
 *
 * Every field is proposed rather than asked for: the model fills them from the
 * analysis and the user's own industry, and the sheet shows them as editable
 * text. An empty prompt with seven blank boxes is a form; a filled one they can
 * correct is a draft.
 */
export const subjectSchema = z.object({
  topic: text(160),
  audience: text(120),
  /** Who is on screen and speaking, for the human-led videos this exists for. */
  speaker: text(120),
  product: optionalText(120),
  cta: text(120),
  location: optionalText(120),
});

export type ScriptSubject = z.infer<typeof subjectSchema>;

/** One beat: what is seen, what is said, and what is written over it. */
export const sceneSchema = z.object({
  /** Its job in the structure, e.g. "Hook" or "Payoff". */
  purpose: text(40),
  seconds: z.coerce.number().transform((value) => Math.min(12, Math.max(1, Math.round(value)))),
  /** The line, spoken verbatim. This is what makes a person on screen say something. */
  voiceover: optionalText(300),
  visual: text(400),
  camera: optionalText(120),
  onScreenText: optionalText(80),
});

export type ScriptScene = z.infer<typeof sceneSchema>;

/**
 * The dispatcher takes at most five beats, so a script that runs longer than
 * that has beats nothing can render. Held here rather than in the compiler
 * because it bounds what the model is asked to write, not just what is sent.
 */
export const MAX_SCENES = 5;

/**
 * The longest single generation any model in the catalogue produces. A script
 * written past this promises a video the pipeline cannot make in one call.
 */
export const MAX_TOTAL_SECONDS = 15;

const scenesField = z
  .array(z.unknown())
  .default([])
  .transform((items) =>
    items
      .map((item) => sceneSchema.safeParse(item))
      .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
      .slice(0, MAX_SCENES),
  )
  // Two is the floor for something that reads as a script rather than a shot,
  // and unlike a long string this cannot be salvaged by trimming.
  .refine((scenes) => scenes.length >= 2, "A script needs at least two scenes");

export const videoScriptSchema = z.object({
  title: text(80),
  metadata: metadataSchema.default({}),
  mechanics: mechanicsSchema,
  subject: subjectSchema,
  scenes: scenesField,
  generationInstructions: generationInstructionsSchema.default({}),
});

export type VideoScript = z.infer<typeof videoScriptSchema>;

/** What the scenes add up to, which is what the video will actually run. */
export function totalSeconds(scenes: readonly ScriptScene[]): number {
  return scenes.reduce((sum, scene) => sum + scene.seconds, 0);
}
