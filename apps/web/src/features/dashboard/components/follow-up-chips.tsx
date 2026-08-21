"use client";

import { type FollowUp } from "@/lib/generation/follow-ups";

/**
 * The next moves, under a finished video.
 *
 * Tapping one fills the composer and stops. It does not send, for the same
 * reason "Use as inspiration" stopped sending: a chip that starts a render is a
 * one-tap way to spend a credit on something the user has not read yet, and the
 * cost of being wrong is not recoverable.
 */
export function FollowUpChips({
  suggestions,
  onPick,
  disabled,
}: {
  suggestions: readonly FollowUp[];
  onPick: (prompt: string) => void;
  disabled: boolean;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(suggestion.prompt)}
          // The full sentence is the accessible name: "Shorter" alone is not a
          // request, and it is the sentence that lands in the composer.
          aria-label={suggestion.prompt}
          title={suggestion.prompt}
          className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-hairline bg-paper px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}
