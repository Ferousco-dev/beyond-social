"use client";

import {
  MAX_VIDEO_SECONDS,
  fits,
  maxWords,
  shortestVideoFit,
  speechSeconds,
  wordCount,
  type Length,
  type LongLength,
} from "./pacing";

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
