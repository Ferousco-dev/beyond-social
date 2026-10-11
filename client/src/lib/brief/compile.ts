import { type ContentBrief } from "./schema";

/**
 * The brief, as the generator receives it.
 *
 * The writer used to author `prompt` directly: a paragraph handed to the video
 * model unedited, alongside the hook and the beats it was already writing for
 * the screen. The two were free to disagree, and did: a five-beat script shown
 * on screen and a generator handed a paragraph that did not contain it. This
 * builds the prompt from the same fields the screen shows instead, the way
 * `compileScript` builds its prompt from mechanics and scenes rather than
 * asking the model to write the final paragraph itself.
 *
 * Titles stay out: they are for a caption, and the hook is already the first
 * beat.
 */

/** What the composer accepts for a message, matched to `sendSchema`. */
const PROMPT_LIMIT = 2000;

/** Below this a beat says nothing useful, so it gives up its detail entirely. */
const MIN_BEAT_DETAIL = 40;

function header(brief: ContentBrief): string {
  return `A ${brief.durationSeconds} second vertical short-form video. Opens on: ${brief.hook}`;
}

function render(brief: ContentBrief, detail: number): string {
  const beats = brief.beats
    .map((beat) => `${beat.timing} ${beat.label}: ${beat.detail.slice(0, detail)}`)
    .join("\n");

  return `${header(brief)}\n\nRun through these beats in order:\n${beats}`;
}

/**
 * Compiles the brief, shortening only as far as it has to.
 *
 * `briefSchema` holds beats to a floor of two, so there is always something to
 * render. Every beat gives up an equal share of its detail rather than the
 * last ones being cut off, the same reasoning as the script compiler: a brief
 * that stops before its payoff is worse than one whose beats are terse.
 */
export function compileBrief(brief: ContentBrief): string {
  const full = render(brief, Number.POSITIVE_INFINITY);
  if (full.length <= PROMPT_LIMIT) return full;

  const overhead = render(brief, 0).length;
  const share = Math.floor((PROMPT_LIMIT - overhead) / brief.beats.length);

  // Beats with nothing left to give still leave the header and their labels,
  // which stays inside the limit and is a worse but sendable brief.
  return (share < MIN_BEAT_DETAIL ? render(brief, 0) : render(brief, share)).slice(0, PROMPT_LIMIT);
}
