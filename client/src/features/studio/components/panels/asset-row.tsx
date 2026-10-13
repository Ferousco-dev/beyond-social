"use client";

import { GripVertical, Pause, Play, Plus } from "lucide-react";
import { useState } from "react";

import { type Asset } from "../../core/types.ts";
import { audition, stopAudition, usePlaying } from "../../hooks/use-audition";
import { ASSET_DRAG_TYPE, placeAsset } from "../../lib/place-asset";
import { resolveSrc } from "../../lib/media-ref";
import { useStudio } from "../../store/editor-store";

const ICON_BUTTON =
  "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4";

/**
 * One file in a panel. It can be played before it is added, dragged onto the
 * timeline, or added with the plus button.
 */
export function AssetRow({ asset }: { asset: Asset }) {
  const url = useStudio((s) => resolveSrc(asset.src, s.mediaUrls));
  const [media, setMedia] = useState<HTMLMediaElement | null>(null);
  const playing = usePlaying(media);
  const playable = asset.kind !== "image";

  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(ASSET_DRAG_TYPE, JSON.stringify(asset));
        event.dataTransfer.effectAllowed = "copy";
      }}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-hairline bg-canvas px-2 py-2 active:cursor-grabbing"
    >
      <GripVertical className="size-4 shrink-0 text-ink-soft" aria-hidden />
      {asset.kind === "image" && url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link, shown once as a thumbnail
        <img src={url} alt="" className="size-9 shrink-0 rounded-md object-cover" draggable={false} />
      ) : null}
      {asset.kind === "video" && url ? (
        <video ref={setMedia} src={url} preload="metadata" playsInline className="h-9 w-6 shrink-0 rounded-md bg-black object-cover" />
      ) : null}
      {asset.kind === "audio" && url ? <audio ref={setMedia} src={url} preload="none" /> : null}
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{asset.name}</span>
      {asset.duration ? <span className="shrink-0 font-mono text-[11px] text-ink-soft">{asset.duration.toFixed(1)}s</span> : null}
      {playable ? (
        <button
          type="button"
          disabled={!media}
          aria-label={playing ? `Stop ${asset.name}` : `Play ${asset.name}`}
          title={playing ? "Stop" : "Play"}
          onClick={() => (playing ? stopAudition() : media && audition(media))}
          className={ICON_BUTTON}
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </button>
      ) : null}
      <button type="button" aria-label={`Add ${asset.name} to the timeline`} title="Add to timeline" onClick={() => placeAsset(asset)} className={ICON_BUTTON}>
        <Plus aria-hidden />
      </button>
    </li>
  );
}
