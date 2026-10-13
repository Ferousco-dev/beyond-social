"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { type LibraryItem } from "@/lib/go-api/schemas";

import { endOf } from "../../core/find.ts";
import { addItem } from "../../core/ops.ts";
import { makeId } from "../../lib/format";
import { probeDuration } from "../../lib/media";
import { selectProject, useStudio } from "../../store/editor-store";

export function MediaPanel({ library }: { library: readonly LibraryItem[] }) {
  const project = useStudio(selectProject);
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (item: LibraryItem): Promise<void> => {
    setBusy(item.id);
    try {
      const seconds = item.duration_seconds ?? (await probeDuration(item.video_url));
      const track = project.tracks.find((t) => t.kind === "video");
      const start = track?.items.reduce((latest, i) => Math.max(latest, endOf(i)), 0) ?? 0;
      const id = makeId();
      const error = useStudio.getState().edit((p) =>
        addItem(p, track?.id ?? "video", {
          kind: "video", id, start, duration: seconds, src: item.video_url, trimIn: 0, sourceDuration: seconds, volume: 1,
        }),
      );
      if (!error) useStudio.getState().select(id);
    } catch (e) {
      useStudio.getState().setNotice(e instanceof Error ? e.message : "That video could not be added.");
    } finally {
      setBusy(null);
    }
  };

  if (library.length === 0) {
    return <p className="p-4 text-sm text-ink-soft">Videos you make appear here. Make one in chat first.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-2 p-3">
      {library.map((item) => (
        <li key={item.id} className="group relative overflow-hidden rounded-lg border border-hairline bg-canvas">
          <video src={item.video_url} poster={item.thumbnail_url} preload="metadata" muted playsInline className="aspect-[9/16] w-full object-cover" />
          <button
            type="button"
            disabled={busy === item.id}
            onClick={() => void add(item)}
            aria-label={`Add ${item.prompt || "video"} to the timeline`}
            className="absolute inset-x-1.5 bottom-1.5 inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-ink text-xs font-medium text-paper hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <Plus className="size-3.5" aria-hidden />
            Add
          </button>
        </li>
      ))}
    </ul>
  );
}
