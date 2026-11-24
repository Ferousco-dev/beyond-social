"use client";

import { Coins } from "lucide-react";

import { Chip } from "@/components/ui/choice-chips";

import {
  LENGTHS,
  LONG_LENGTHS,
  MAX_VIDEO_SECONDS,
  fits,
  maxWords,
  recommendedLength,
  shortestVideoFit,
  speechSeconds,
  wordCount,
  type Length,
  type LongLength,
} from "./pacing";
import { useSceneQuotes } from "./scene-quotes";

const label = (length: number): string => (length >= 60 ? `${length / 60} min` : `${length}s`);

/**
 * One row of lengths, short to long. The model renders 15 seconds at most, so
 * anything longer is joined from clips automatically; the person only picks a
 * length. What it costs, and how it is made, is said once for the chosen one.
 */
export function LengthPicker({
  value,
  onChange,
  spoken,
  contentKind,
  withLong = true,
}: {
  value: Length | LongLength;
  onChange: (length: Length | LongLength) => void;
  spoken: string;
  contentKind: string;
  /** Offer lengths past one clip. Off where the result must be a single clip. */
  withLong?: boolean;
}) {
  // Spoken words turn sound on, which the provider charges more for, so the price follows it.
  const quotes = useSceneQuotes(spoken.trim() !== "");
  const recommended = recommendedLength(spoken, contentKind);
  const options: readonly (Length | LongLength)[] = withLong ? [...LENGTHS, ...LONG_LENGTHS] : LENGTHS;
  const credits = quotes[value];

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Video length">
      <span className="text-sm font-medium text-ink">Video length</span>
      <div className="flex flex-wrap gap-2">
        {options.map((length) => (
          <Chip key={length} selected={value === length} onClick={() => onChange(length)}>
            <span className="tabular-nums">{label(length)}</span>
            {length === recommended ? <span className="ml-1.5 text-[11px] opacity-70">Best fit</span> : null}
          </Chip>
        ))}
      </div>
      {credits === null ? null : (
        <p className="inline-flex items-center gap-1.5 text-xs text-ink-soft" role="status">
          <Coins className="size-3.5" aria-hidden />
          {credits === undefined ? "…" : `${credits} credits`}
        </p>
      )}
      <PacingNote spoken={spoken} seconds={value} onPick={onChange} />
    </div>
  );
}

/** Says whether the words fit, and how to make them fit when they do not. */
export function PacingNote({
  spoken,
  seconds,
  onPick,
}: {
  spoken: string;
  seconds: number;
  onPick?: (length: Length | LongLength) => void;
}) {
  const words = wordCount(spoken);
  if (words === 0) return null;
  const needed = Math.ceil(speechSeconds(spoken));
  // Words that fit need no comment; only a script that is too long is pointed out.
  if (fits(spoken, seconds)) return null;
  const fit = shortestVideoFit(spoken);
  const trim = words - maxWords(fit ?? MAX_VIDEO_SECONDS);
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-ink"
    >
      <span>
        Your script needs about {needed}s to say clearly, more than {seconds}s.{" "}
        {fit
          ? `Pick ${fit}s or cut about ${words - maxWords(seconds)} words.`
          : `Cut about ${trim} words to fit ${MAX_VIDEO_SECONDS / 60} minutes, the longest video.`}
      </span>
      {fit && onPick ? (
        <button
          type="button"
          onClick={() => onPick(fit)}
          className="cursor-pointer font-medium text-primary underline underline-offset-2"
        >
          Use {fit}s
        </button>
      ) : null}
    </div>
  );
}
