import { z } from "zod";

import { optionalText, textList } from "./schema-fields";

/**
 * How to render this, as opposed to what it says.
 *
 * Everything here is a plausible thing for the model that wrote the script
 * to also propose: it already knows the mechanics and the subject, and a
 * style or a shot language that fits both is squarely the kind of judgment
 * a writing pass makes. Every field defaults, because a script that shipped
 * before this block existed, or a reply that only fills in the required
 * mechanics and subject, still has to parse.
 */
export const generationInstructionsSchema = z.object({
  /** The overall look, e.g. "Handheld, natural light, UGC-style". Distinct
   *  from any one scene's `visual`, which describes what is in frame. */
  style: optionalText(140),
  /** Shot language for the whole video, e.g. "Phone-shot, no gimbal, mostly
   *  static frames with the occasional push in." Distinct from a scene's own
   *  `camera`, which is that scene's specific move. */
  cinematography: optionalText(160),
  /** Music and sound design direction, which nothing else in the script
   *  captures at all. */
  audio: optionalText(140),
  /** Short, specific things the render must not contain. */
  negativePrompts: textList(100, 6),
  /** Any literal technical instruction for the generation model that isn't
   *  creative direction, e.g. a framing or pacing constraint the renderer
   *  needs stated outright. */
  modelInstructions: optionalText(200),
});

export type GenerationInstructions = z.infer<typeof generationInstructionsSchema>;
