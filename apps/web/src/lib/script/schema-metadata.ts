import { z } from "zod";

import { optionalText } from "./schema-fields";

/**
 * What kind of video this is, as opposed to what it says or how it was made.
 *
 * Nothing here is written by the model: `writeScript` never asks for it, and
 * a reply that omits it entirely still parses, defaulted. Every field is
 * either a fact this pipeline already knows before it writes a line (aspect
 * ratio: the renderer only ever cuts vertical shorts) or something supplied
 * by the caller's own context (category: the user's industry) rather than
 * invented from the brief.
 *
 * Duration is deliberately not a field. `totalSeconds(scenes)` already
 * computes it from the scenes, which are the source of truth; a second,
 * stored number would drift from them the first time a scene's length
 * changed and nothing happened to re-derive it.
 */

/**
 * Its own list rather than the composer's `ASPECT_RATIOS`: that one includes
 * `"Auto"`, a sentinel meaning "the caller hasn't decided yet", which is a
 * fact about a request, not about a finished script.
 */
const ASPECT_RATIOS = ["9:16", "16:9", "1:1"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const metadataSchema = z.object({
  /** This pipeline only ever writes vertical shorts today; kept as a real
   *  field, not a hardcoded string, so `compile.ts` reads it rather than
   *  assumes it, and a future caller that isn't vertical-only is not blocked. */
  aspectRatio: z.enum(ASPECT_RATIOS).default("9:16"),
  /**
   * Which surface this is destined for. No step before script-writing
   * currently picks one, so this stays empty until that exists; the field is
   * here so a caller that does know can set it without a second schema change.
   */
  platform: optionalText(40),
  /** The user's industry at the time the script was written, e.g. "Food and
   *  drink". Filled in by `writeScript` from the caller's own profile, not
   *  asked of the model. */
  category: optionalText(60),
});

export type ScriptMetadata = z.infer<typeof metadataSchema>;
