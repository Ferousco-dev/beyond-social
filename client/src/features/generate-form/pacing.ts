/**
 * How long a script takes to say at a natural pace, so a clip is never
 * generated with speech squeezed into too few seconds.
 */

/** About 150 words a minute: clear, unhurried social-video delivery. */
export const WORDS_PER_SECOND = 2.5;

/** The clip lengths the generator renders. */
export const LENGTHS = [5, 8, 10, 15] as const;
export type Length = (typeof LENGTHS)[number];
export const MAX_LENGTH: Length = 15;

/**
 * Lengths past one clip. The model renders at most 15 seconds at a time, so a
 * long video is made as several clips, one after another, and joined on the timeline.
 */
export const LONG_LENGTHS = [30, 60, 90, 120, 180] as const;
export type LongLength = (typeof LONG_LENGTHS)[number];
export const MAX_VIDEO_SECONDS: LongLength = 180;

export function isLong(seconds: number): boolean {
  return seconds > MAX_LENGTH;
}

export function wordCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/u).length;
}

export function speechSeconds(text: string): number {
  return wordCount(text) / WORDS_PER_SECOND;
}

export function maxWords(seconds: number): number {
  return Math.floor(seconds * WORDS_PER_SECOND);
}

/** Whether the words can be said in the clip without rushing. */
export function fits(text: string, seconds: number): boolean {
  return wordCount(text) <= maxWords(seconds);
}

/** The shortest length that fits the words, or null when none does. */
export function shortestFit(text: string): Length | null {
  return LENGTHS.find((length) => fits(text, length)) ?? null;
}

/** The shortest length, clip or long, that fits the words, or null when even three minutes is too short. */
export function shortestVideoFit(text: string): Length | LongLength | null {
  return [...LENGTHS, ...LONG_LENGTHS].find((length) => fits(text, length)) ?? null;
}

/** Snaps any stored length (older drafts allowed 3 to 15) to an offered one. */
export function toLength(seconds: number): Length {
  return LENGTHS.find((length) => length >= seconds) ?? MAX_LENGTH;
}

/** Like toLength, but keeps a long length: snaps up to an offered clip or long length, never above 3 minutes. */
export function toVideoLength(seconds: number): Length | LongLength {
  if (!isLong(seconds)) return toLength(seconds);
  return LONG_LENGTHS.find((length) => length >= seconds) ?? MAX_VIDEO_SECONDS;
}

/**
 * A suggested length for the words and the kind of video: product shots
 * land best short, people talking need room to breathe.
 */
export function recommendedLength(text: string, contentKind: string): Length {
  const floor: Length = contentKind === "Product-focused" ? 8 : contentKind === "Human-led" ? 10 : 8;
  const needed = shortestFit(text) ?? MAX_LENGTH;
  return needed > floor ? needed : floor;
}

/**
 * The words a viewer hears in a clip. The hook describes the opening shot, so
 * only the dialogue and the call to action are spoken.
 */
/** A clip with spoken words is made with sound, which the provider charges more for. */
export function hasSound(parts: { dialogue: string; cta: string }): boolean {
  return spokenText(parts).trim() !== "";
}

export function spokenText(parts: { dialogue: string; cta: string }): string {
  return [parts.dialogue, parts.cta].map((part) => part.trim()).filter(Boolean).join("\n");
}
