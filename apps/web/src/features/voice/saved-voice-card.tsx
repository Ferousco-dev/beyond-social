"use client";

import { Check, Mic, Pause, Play, Trash2 } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { type VoiceProfile } from "./actions";
import { VoiceCloneAction } from "./clone-action";

interface Props {
  profile: VoiceProfile;
  playing: boolean;
  busy: boolean;
  deleting: boolean;
  error: string | null;
  onTogglePlay: () => void;
  onRecord: () => void;
  onDelete: () => void;
}

/** The card once a clip is already saved: preview, re-record, delete, and clone status. */
export function SavedVoiceCard({
  profile,
  playing,
  busy,
  deleting,
  error,
  onTogglePlay,
  onRecord,
  onDelete,
}: Props) {
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
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">Your saved voice</h2>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Check className="size-2.5" aria-hidden />
              Saved
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Type what you want said and your saved voice will speak it. Re-record to replace it.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!profile.url}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-50"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? "Pause" : "Preview"}
            </button>
            <button
              type="button"
              onClick={onRecord}
              disabled={busy}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-50"
            >
              <Mic className="size-3.5" />
              Re-record
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {deleting ? <Spinner className="size-3.5" /> : <Trash2 className="size-3.5" />}
              Delete
            </button>
          </div>
          <VoiceCloneAction status={profile.cloneStatus} error={profile.cloneError} />
        </div>
      </div>
      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
