"use client";

import { Clapperboard, X } from "lucide-react";

import { type PendingFootage } from "../hooks/use-footage-upload";

/**
 * The attached footage, shown above the composer.
 *
 * Named rather than shown. A thumbnail would mean fetching a hundred megabytes
 * back down to draw one frame of something the user just picked from their own
 * device, which is a lot of bytes to prove a file exists.
 *
 * The second line says what the footage is for, because a video in a composer
 * that mostly makes video is genuinely ambiguous: this is the motion being
 * copied, not the thing being produced.
 */
export function FootageChip({
  footage,
  onRemove,
}: {
  footage: PendingFootage;
  onRemove: () => void;
}) {
  return (
    <div className="mx-1 mb-2 flex items-center gap-3 rounded-2xl border border-hairline bg-canvas p-2.5">
      <span
        aria-hidden
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        <Clapperboard className="size-5" />
      </span>
      {/* min-w-0 so a long file name truncates instead of pushing the remove
          button off the end of the row. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{footage.name}</span>
        <span className="block text-xs text-ink-soft">Motion to copy</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${footage.name}`}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
