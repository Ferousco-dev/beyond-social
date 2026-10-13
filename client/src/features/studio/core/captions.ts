import { endOf } from "./find.ts";
import { type CaptionStyle, type Item } from "./types.ts";

export interface SpokenWord {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

type Media = Extract<Item, { kind: "video" | "audio" }>;
type CaptionItem = Extract<Item, { kind: "caption" }>;

const MAX_WORDS = 6;
const MAX_SECONDS = 2.6;
const BREAK_GAP = 0.6;
const SENTENCE_END = /[.!?]["')]?$/;
/** A caption never flashes by faster than this. */
const MIN_CAPTION = 0.4;

export const DEFAULT_CAPTION_STYLE: CaptionStyle = { preset: "karaoke", color: "#ffffff", highlight: "#ffd400", size: 64, y: 0.8 };

/**
 * Turns the words spoken in a clip into caption items on the timeline.
 *
 * Word times are measured in the source media. Only the part of the source the
 * clip actually plays (after trimming) is kept, and each time is moved to where
 * that moment sits on the timeline. Words are grouped into short phrases that
 * break at sentence ends, pauses, or when a phrase gets long.
 */
export function captionsFromWords(words: readonly SpokenWord[], clip: Media, newId: () => string, style: CaptionStyle = DEFAULT_CAPTION_STYLE): CaptionItem[] {
  const from = clip.trimIn;
  const to = clip.trimIn + clip.duration;
  const inside = words
    .filter((w) => w.end > from && w.start < to)
    .map((w) => ({ text: w.text, start: Math.max(w.start, from) - from + clip.start, end: Math.min(w.end, to) - from + clip.start }))
    .filter((w) => w.end > w.start);

  const phrases: (typeof inside)[] = [];
  for (const word of inside) {
    const current = phrases.at(-1);
    const last = current?.at(-1);
    const startNew = !current || !last || word.start - last.end > BREAK_GAP || current.length >= MAX_WORDS || word.end - current[0]!.start > MAX_SECONDS || SENTENCE_END.test(last.text);
    if (startNew) phrases.push([word]);
    else current.push(word);
  }

  return phrases.flatMap((phrase, index) => {
    const start = phrase[0]!.start;
    // Hold each caption until the next begins, within reason, so nothing blinks off between phrases.
    const next = phrases[index + 1]?.[0]?.start;
    const natural = phrase.at(-1)!.end;
    const end = Math.max(natural, Math.min(next ?? natural + 0.3, natural + 0.5));
    const duration = Math.max(MIN_CAPTION, end - start);
    return [
      {
        kind: "caption" as const,
        id: newId(),
        start,
        duration,
        text: phrase.map((w) => w.text).join(" "),
        words: phrase.map((w) => ({ text: w.text, start: w.start - start, end: Math.min(w.end - start, duration) })),
        style,
      },
    ];
  });
}

export const clipEnd = (clip: Media): number => endOf(clip);
