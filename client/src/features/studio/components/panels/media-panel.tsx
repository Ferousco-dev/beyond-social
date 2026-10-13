"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { type LibraryItem } from "@/lib/go-api/schemas";

import { ASSET_DRAG_TYPE, placeJobVideo } from "../../lib/place-asset";
import { probeDuration } from "../../lib/media";
import { useStudio } from "../../store/editor-store";
import { AssetsPanel } from "./assets-panel";

export function MediaPanel({ library, chatLibrary }: { library: readonly LibraryItem[]; chatLibrary: readonly LibraryItem[] }) {
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (item: LibraryItem): Promise<void> => {
    setBusy(item.id);
    try {
      const seconds = item.duration_seconds ?? (await probeDuration(item.video_url));
      await placeJobVideo(item.id, item.prompt || "Made in this app", seconds);
    } catch (e) {
      useStudio.getState().setNotice(e instanceof Error ? e.message : "That video could not be added.");
    } finally {
      setBusy(null);
    }
  };

  // A video from this chat is also in the whole library, so it is not shown twice.
  const inChat = new Set(chatLibrary.map((item) => item.id));
  const others = library.filter((item) => !inChat.has(item.id));

  return (
    <div>
      <AssetsPanel kind="video" />
      {chatLibrary.length > 0 ? <VideoGrid title="From this chat" items={chatLibrary} busy={busy} onAdd={add} /> : null}
      <VideoGrid title="Made in this app" items={others} busy={busy} onAdd={add} empty={chatLibrary.length === 0} />
    </div>
  );
}

function VideoGrid({
  title,
  items,
  busy,
  onAdd,
  empty = false,
}: {
  title: string;
  items: readonly LibraryItem[];
  busy: string | null;
  onAdd: (item: LibraryItem) => Promise<void>;
  empty?: boolean;
}) {
  return (
    <section aria-label={title}>
      <h3 className="px-3 pt-3 text-xs text-ink-soft">{title}</h3>
      {items.length === 0 && empty ? <p className="p-3 text-sm text-ink-soft">Videos you make in chat appear here.</p> : null}
      <ul className="grid grid-cols-2 gap-2 p-3">
        {items.map((item) => (
          <li
            key={item.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(
                ASSET_DRAG_TYPE,
                JSON.stringify({ job: item.id, src: item.video_url, name: (item.prompt || "Made in this app").slice(0, 120), kind: "video", ...(item.duration_seconds ? { duration: item.duration_seconds } : {}) }),
              );
              event.dataTransfer.effectAllowed = "copy";
            }}
            className="group relative cursor-grab overflow-hidden rounded-lg border border-hairline bg-canvas active:cursor-grabbing"
          >
            <video src={item.video_url} poster={item.thumbnail_url} preload="metadata" muted playsInline className="aspect-[9/16] w-full object-cover" />
            <button
              type="button"
              disabled={busy === item.id}
              onClick={() => void onAdd(item)}
              aria-label={`Add ${item.prompt || "video"} to the timeline`}
              className="absolute inset-x-1.5 bottom-1.5 inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md bg-ink text-xs font-medium text-paper hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
            >
              <Plus className="size-3.5" aria-hidden />
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
