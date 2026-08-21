import { type ContentBrief } from "./schema";

/**
 * The brief, as the renderer receives it.
 *
 * The refiner writes a hook, a set of titles and a run of timed beats, shows
 * all of it, and then handed the composer `prompt` alone. The beats were on
 * screen and nowhere else: the user read a five-beat script, pressed the
 * button, and the generator was given a paragraph that did not contain it. The
 * same failure the post analysis had, in the other half of the product.
 *
 * So the beats travel with it. Nothing else does: the titles are for a caption
 * and the hook is already the first beat.
 */

/** What the composer accepts for a message, matched to `sendSchema`. */
const PROMPT_LIMIT = 2000;

/** Below this a beat says nothing useful, so the beats are dropped instead. */
const MIN_BEAT_DETAIL = 40;

function render(brief: ContentBrief, detail: number): string {
  const beats = brief.beats
    .map((beat) => `${beat.timing} ${beat.label}: ${beat.detail.slice(0, detail)}`)
    .join("\n");

  return `${brief.prompt}\n\nRun through these beats in order:\n${beats}`;
}

export function compileBrief(brief: ContentBrief): string {
  if (brief.beats.length === 0) return brief.prompt;

  const full = render(brief, Number.POSITIVE_INFINITY);
  if (full.length <= PROMPT_LIMIT) return full;

  /*
   * Every beat gives up an equal share rather than the last ones being cut off.
   * A brief that stops before its payoff is worse than one whose beats are
   * terse, for the same reason the script compiler shortens rather than
   * truncates.
   */
  const overhead = render(brief, 0).length;
  const share = Math.floor((PROMPT_LIMIT - overhead) / brief.beats.length);

  // `prompt` alone is already inside the limit, so this is always sendable.
  return share < MIN_BEAT_DETAIL ? brief.prompt : render(brief, share);
}
