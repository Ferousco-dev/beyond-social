"use client";

import {
  Clapperboard,
  Eye,
  EyeOff,
  Layers,
  Lock,
  LockOpen,
  Music,
  Type,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";

import { type Track, type TrackKind } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

const ICONS: Record<TrackKind, LucideIcon> = {
  video: Clapperboard,
  overlay: Layers,
  text: Type,
  audio: Music,
};

const TOGGLE =
  "inline-flex size-5 items-center justify-center rounded text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

/** Track label plus the per-track mute, hide, and lock switches. */
export function TrackHead({
  track,
  height,
  onToggle,
}: {
  track: Track;
  height: string;
  onToggle: (key: "muted" | "hidden" | "locked") => void;
}) {
  const Icon = ICONS[track.kind];
  const audible = track.kind === "audio" || track.kind === "video";

  return (
    <div className={cn("flex items-center gap-1 px-2", height)}>
      {/* The icon carries the meaning when the label is hidden, so it keeps an
          accessible name rather than staying decorative. */}
      <Icon className="size-3.5 shrink-0 text-ink-soft sm:hidden" aria-label={track.label} />
      <Icon className="hidden size-3.5 shrink-0 text-ink-soft sm:block" aria-hidden />
      <span className="hidden min-w-0 flex-1 truncate text-[10px] font-medium uppercase tracking-wide text-ink-soft sm:block">
        {track.label}
      </span>

      {audible ? (
        <button
          type="button"
          onClick={() => onToggle("muted")}
          aria-pressed={track.muted}
          aria-label={`${track.muted ? "Unmute" : "Mute"} ${track.label}`}
          className={cn(TOGGLE, "hidden sm:inline-flex")}
        >
          {track.muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onToggle("hidden")}
        aria-pressed={track.hidden}
        aria-label={`${track.hidden ? "Show" : "Hide"} ${track.label}`}
        className={cn(TOGGLE, "hidden sm:inline-flex")}
      >
        {track.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      </button>

      <button
        type="button"
        onClick={() => onToggle("locked")}
        aria-pressed={track.locked}
        aria-label={`${track.locked ? "Unlock" : "Lock"} ${track.label}`}
        className={cn(TOGGLE, "hidden sm:inline-flex")}
      >
        {track.locked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
      </button>
    </div>
  );
}
