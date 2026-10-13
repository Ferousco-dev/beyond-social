"use client";

import { Type } from "lucide-react";

import { addItem } from "../../core/ops.ts";
import { makeId } from "../../lib/format";
import { NEW_ITEM_SECONDS } from "../../config";
import { useStudio } from "../../store/editor-store";

export function TextPanel() {
  const add = (): void => {
    const { currentTime, edit, select, history } = useStudio.getState();
    const track = history.present.tracks.find((t) => t.kind === "text");
    const id = makeId();
    const error = edit((p) =>
      addItem(p, track?.id ?? "text", {
        kind: "text", id, start: currentTime, duration: NEW_ITEM_SECONDS, text: "Your text",
        style: { preset: "classic", color: "#ffffff", size: 72, y: 0.5 },
      }),
    );
    if (!error) select(id);
  };

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-ink-soft">Adds text at the playhead. Select it to change the words, colour and size, then drag it in the preview to place it.</p>
      <button
        type="button"
        onClick={add}
        className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-hairline text-sm text-ink hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Type className="size-4" aria-hidden />
        Add text
      </button>
    </div>
  );
}
