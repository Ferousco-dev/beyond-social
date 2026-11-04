"use client";

import { Crosshair, X } from "lucide-react";

import { endOf, locate } from "../../core/find.ts";
import { formatTimecode } from "../../lib/format";
import { selectProject, useStudio } from "../../store/editor-store";

const BUTTON =
  "inline-flex h-7 cursor-pointer items-center rounded-md border border-hairline px-2 text-xs text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

/**
 * The part of the video the assistant should change. Marked from the
 * playhead, from the selected clip, or by Shift-dragging on the ruler.
 */
export function SelectionBar() {
  const range = useStudio((s) => s.range);
  const project = useStudio(selectProject);
  const selected = useStudio((s) => s.selection);
  const clip = selected ? locate(project, selected)?.item : undefined;
  const { setRange } = useStudio.getState();

  if (range) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs text-ink">
        <span className="flex items-center gap-1.5">
          <Crosshair className="size-3.5 text-primary" aria-hidden />
          Editing {formatTimecode(range.start)} to {formatTimecode(range.end)}{" "}
          only
        </span>
        <button
          type="button"
          aria-label="Edit the whole video instead"
          onClick={() => setRange(null)}
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-paper hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
      <span>Edit part of it:</span>
      <button
        type="button"
        className={BUTTON}
        disabled={!clip}
        onClick={() =>
          clip && setRange({ start: clip.start, end: endOf(clip) })
        }
      >
        Selected clip
      </button>
      <button
        type="button"
        className={BUTTON}
        onClick={() => {
          const now = useStudio.getState().currentTime;
          setRange({ start: now, end: now + 3 });
        }}
      >
        3s from playhead
      </button>
      <span className="basis-full text-[11px]">
        or Shift-drag on the timeline ruler.
      </span>
    </div>
  );
}
