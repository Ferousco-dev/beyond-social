import { Mic } from "lucide-react";

/**
 * Holds the voice card's space while the profile is read.
 *
 * Same frame and same icon as the card it stands in for, so the section does
 * not jump when the real one arrives.
 */
export function VoiceCardSkeleton() {
  return (
    <div className="h-full rounded-2xl border border-hairline bg-paper p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Mic className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="h-4 w-32 animate-pulse rounded bg-cloud" />
          <div className="mt-2 h-3 w-64 animate-pulse rounded bg-cloud" />
        </div>
      </div>
    </div>
  );
}
