"use client";

import { AudioLines, X } from "lucide-react";

import { type PendingVoice } from "../hooks/use-voice-upload";

/**
 * The attached voice clip, shown above the composer.
 *
 * Audio has no thumbnail, so where a photo shows itself this has to say what it
 * is in words. Without it the clip uploaded invisibly and the only way to know
 * it had worked was to send and see what came back.
 */
export function VoiceChip({ voice, onRemove }: { voice: PendingVoice; onRemove: () => void }) {
  return (
    <div className="mx-1 mb-2 flex items-center gap-3 rounded-2xl border border-hairline bg-canvas p-2.5">
      <span
        aria-hidden
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        <AudioLines className="size-5" />
      </span>
      {/* min-w-0 so a long file name truncates instead of pushing the remove
          button off the end of the row. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{voice.name}</span>
        <span className="block text-xs text-ink-soft">Your voice</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${voice.name}`}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
