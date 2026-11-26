import type { RATIOS } from "./types.ts";

type Ratio = (typeof RATIOS)[number];

const SUPPORTED: readonly (readonly [Ratio, number])[] = [
  ["9:16", 9 / 16],
  ["1:1", 1],
  ["16:9", 16 / 9],
];

/**
 * A size typed by the person, such as "16:9", "4:5" or "1920x1080", as the
 * nearest frame the video model makes (tall, square or wide). Null when the
 * text is not a size.
 */
export function parseDimension(text: string): Ratio | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*[:x×/]\s*(\d+(?:\.\d+)?)\s*$/iu.exec(text);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!(width > 0 && height > 0)) return null;
  const wanted = Math.log(width / height);
  let best = SUPPORTED[0]!;
  for (const option of SUPPORTED) {
    if (Math.abs(Math.log(option[1]) - wanted) < Math.abs(Math.log(best[1]) - wanted)) best = option;
  }
  return best[0];
}
