import { MAX_LENGTH, MAX_VIDEO_SECONDS, WORDS_PER_SECOND } from "./pacing.ts";

/** One clip of a long video: what it shows and how long it runs. */
export interface LongPart {
  readonly prompt: string;
  readonly seconds: number;
}

/** The shortest clip the generator is asked for. */
const MIN_PART_SECONDS = 5;
/** The generator accepts up to 2500 characters for one clip; leave room for its own additions. */
const MAX_PART_RUNES = 2300;

/** How many clips a video of this length needs, each at most 15 seconds. */
export function partCount(totalSeconds: number): number {
  const total = Math.min(Math.max(Math.round(totalSeconds), MIN_PART_SECONDS), MAX_VIDEO_SECONDS);
  return Math.ceil(total / MAX_LENGTH);
}

/** The length of each clip: as even as whole seconds allow, adding up to the total. */
export function partSeconds(totalSeconds: number): number[] {
  const total = Math.min(Math.max(Math.round(totalSeconds), MIN_PART_SECONDS), MAX_VIDEO_SECONDS);
  const count = partCount(total);
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0));
}

function sentences(text: string): string[] {
  return text
    .split(/\n+/u)
    .flatMap((line) => line.match(/[^.!?]+[.!?]*\s*/gu) ?? [line])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== "");
}

function words(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/u).length;
}

/** Deals the sentences out in order, so each clip gets about the same share of the words and none is split mid-sentence. */
export function shareOut(text: string, count: number): string[] {
  const all = sentences(text);
  const chunks: string[][] = Array.from({ length: count }, () => []);
  if (all.length === 0) return chunks.map(() => "");
  const total = all.reduce((sum, sentence) => sum + words(sentence), 0);
  let used = 0;
  let index = 0;
  for (const sentence of all) {
    const target = Math.min(count - 1, Math.floor(((used + words(sentence) / 2) / total) * count));
    index = Math.max(index, target);
    chunks[index]?.push(sentence);
    used += words(sentence);
  }
  return chunks.map((chunk) => chunk.join(" "));
}

function clip(text: string, runes: number): string {
  const chars = Array.from(text);
  return chars.length <= runes ? text : chars.slice(0, runes).join("").trim();
}

/** Where a clip sits in the story, for a video with no script text to share out. */
function beat(index: number, count: number): string {
  if (count === 1) return "the whole video";
  if (index === 0) return "the opening";
  if (index === count - 1) return "the closing";
  return "the middle";
}

/**
 * Cuts one brief into the clips of a long video. `setting` describes the look
 * every clip shares (who, where, style); `story` is the script, shared out in
 * order. Each clip is told its place and to keep the same person and place, so
 * the pieces read as one video when joined.
 */
export function planLongVideo({ setting, story, totalSeconds }: { setting: string; story: string; totalSeconds: number }): LongPart[] {
  const seconds = partSeconds(totalSeconds);
  const count = seconds.length;
  const shares = shareOut(story, count);
  return seconds.map((length, index) => {
    const own = shares[index] ?? "";
    const place = `Part ${index + 1} of ${count} of one continuous video: ${beat(index, count)}. Keep the same person, clothes, place and light as the other parts.`;
    const lines = [place, setting.trim(), own !== "" ? own : ""].filter((line) => line !== "");
    return { prompt: clip(lines.join("\n"), MAX_PART_RUNES), seconds: length };
  });
}

/** The most words a clip of this length can say without rushing. */
export function wordsFor(seconds: number): number {
  return Math.floor(seconds * WORDS_PER_SECOND);
}
