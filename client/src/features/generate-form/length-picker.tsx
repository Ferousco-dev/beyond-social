"use client";

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

/**
 * The clip length, its credit cost, the suggested length for this kind of
 * video, and whether the spoken words fit without being rushed.
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

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Video length">
      <span className="text-sm font-medium text-ink">Video length</span>
      <div className="flex flex-wrap gap-2">
        {LENGTHS.map((length) => {
          const credits = quotes[length];
          return (
            <Chip
              key={length}
              selected={value === length}
              onClick={() => onChange(length)}
            >
              <span className="tabular-nums">{length}s</span>
              <span className="ml-1.5 text-xs opacity-70 tabular-nums">
                {credits === undefined
                  ? "…"
                  : credits === null
                    ? ""
                    : `${credits} credits`}
              </span>
              {length === recommended ? (
                <span className="ml-1.5 text-xs font-medium">
                  · Recommended
                </span>
              ) : null}
            </Chip>
          );
        })}
      </div>
      {withLong ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-soft">
            Long video, made as several clips joined in order
          </span>
          <div className="flex flex-wrap gap-2">
            {LONG_LENGTHS.map((length) => {
              const credits = quotes[length];
              return (
                <Chip
                  key={length}
                  selected={value === length}
                  onClick={() => onChange(length)}
                >
                  <span className="tabular-nums">
                    {length >= 60 ? `${length / 60} min` : `${length}s`}
                  </span>
                  <span className="ml-1.5 text-xs opacity-70 tabular-nums">
                    {credits === undefined
                      ? "…"
                      : credits === null
                        ? ""
                        : `${credits} credits`}
                  </span>
                </Chip>
              );
            })}
          </div>
        </div>
      ) : null}
      <p className="text-xs text-ink-soft">
        Longer videos cost more credits. {recommended}s suits{" "}
        {contentKind === ""
          ? "this video"
          : `a ${contentKind.toLowerCase()} video`}
        {wordCount(spoken) > 0
          ? " and fits your script at a natural pace."
          : "."}
      </p>
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
  if (fits(spoken, seconds)) {
    return (
      <p className="text-xs text-ink-soft" role="status">
        About {needed}s of speech: it fits {seconds}s at a natural pace.
      </p>
    );
  }
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
