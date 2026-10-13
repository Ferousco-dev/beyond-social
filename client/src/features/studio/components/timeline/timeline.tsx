"use client";

import { AudioLines, Captions, Film, Image as ImageIcon, Type, type LucideIcon } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";

import { endOf, locate } from "../../core/find.ts";
import { moveItem, trimItem } from "../../core/ops.ts";
import { type Item, type Project, type Track, type TrackKind } from "../../core/types.ts";
import { STUDIO_TIMELINE } from "../../config";
import { clamp, snapTo } from "../../lib/format";
import { projectDuration } from "../../core/find.ts";
import { soundFor, soundId } from "../../lib/sounds";
import { useUpload } from "../../hooks/use-upload";
import { ASSET_DRAG_TYPE, placeAsset, placeJobVideo, readDraggedAsset } from "../../lib/place-asset";
import { selectProject, useStudio } from "../../store/editor-store";
import { TimelineItem, type DragMode } from "./timeline-item";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineToolbar } from "./timeline-toolbar";
import { cn } from "@/lib/utils";

const TRACK_LOOK: Record<TrackKind, { label: string; Icon: LucideIcon; colour: string }> = {
  text: { label: "Text", Icon: Type, colour: "bg-clip-text" },
  caption: { label: "Captions", Icon: Captions, colour: "bg-clip-caption" },
  overlay: { label: "Images", Icon: ImageIcon, colour: "bg-clip-image" },
  video: { label: "Video", Icon: Film, colour: "bg-clip-video" },
  audio: { label: "Audio", Icon: AudioLines, colour: "bg-clip-audio" },
};

function itemLabel(item: Item, project: Project): string {
  switch (item.kind) {
    case "caption":
    case "text":
      return item.text || "Text";
    default:
      return project.assets?.find((a) => a.src === item.src)?.name ?? soundFor(soundId(item.src) ?? "")?.name ?? (item.kind === "image" ? "Image" : item.kind === "audio" ? "Audio" : "Video");
  }
}

function snapPoints(project: Project, ignoreId: string, time: number): number[] {
  const points = [0, time];
  for (const track of project.tracks) for (const item of track.items) if (item.id !== ignoreId) points.push(item.start, endOf(item));
  return points;
}

export function Timeline() {
  const project = useStudio(selectProject);
  const zoom = useStudio((s) => s.zoom);
  const selection = useStudio((s) => s.selection);
  const currentTime = useStudio((s) => s.currentTime);
  const content = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  const { upload } = useUpload();
  const span = projectDuration(project) + STUDIO_TIMELINE.TAIL_SECONDS;

  const scrub = useCallback((clientX: number): void => {
    const box = content.current?.getBoundingClientRect();
    if (!box) return;
    useStudio.getState().seek((clientX - box.left) / useStudio.getState().zoom);
    const move = (e: PointerEvent): void => useStudio.getState().seek((e.clientX - box.left) / useStudio.getState().zoom);
    const stop = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }, []);

  const drag = (live: Item, mode: DragMode, seconds: number): void => {
    const state = useStudio.getState();
    const base = state.gestureBase ?? state.history.present;
    // Offsets are measured from where the drag began, not from the live preview.
    const item = locate(base, live.id)?.item ?? live;
    const threshold = STUDIO_TIMELINE.SNAP_THRESHOLD_PX / state.zoom;
    const points = state.snapping ? snapPoints(base, item.id, state.currentTime) : [];
    const snap = (t: number): number => snapTo(t, points, threshold);
    if (mode === "move") {
      const start = Math.max(0, snap(item.start + seconds));
      // Snap the leading edge, or the trailing one if that is closer.
      const trailing = snap(item.start + seconds + item.duration) - item.duration;
      const chosen = Math.abs(start - (item.start + seconds)) <= Math.abs(trailing - (item.start + seconds)) ? start : Math.max(0, trailing);
      state.drag((p) => moveItem(p, item.id, chosen));
    } else if (mode === "start") state.drag((p) => trimItem(p, item.id, "start", clamp(snap(item.start + seconds), 0, endOf(item))));
    else state.drag((p) => trimItem(p, item.id, "end", snap(endOf(item) + seconds)));
  };

  const accepts = (event: DragEvent): boolean => event.dataTransfer.types.includes(ASSET_DRAG_TYPE) || event.dataTransfer.types.includes("Files");

  /** A file from the library lands where it is dropped; a file from the desktop is uploaded first. */
  const drop = async (event: DragEvent): Promise<void> => {
    event.preventDefault();
    setOver(false);
    const box = content.current?.getBoundingClientRect();
    if (!box) return;
    const at = Math.max(0, (event.clientX - box.left) / useStudio.getState().zoom);
    const dragged = readDraggedAsset(event.dataTransfer);
    if (dragged) return dragged.job ? placeJobVideo(dragged.job, dragged.asset.name, dragged.asset.duration, at) : placeAsset(dragged.asset, at);
    let cursor = at;
    for (const file of Array.from(event.dataTransfer.files)) {
      const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("image/") ? "image" : null;
      if (!kind) {
        useStudio.getState().setNotice(`${file.name} is not a video, sound or picture.`);
        continue;
      }
      const uploaded = await upload(file, kind);
      if (!uploaded) continue;
      placeAsset(uploaded, cursor);
      cursor += uploaded.duration ?? 3;
    }
  };

  const rows = [...project.tracks];
  const order: TrackKind[] = ["text", "overlay", "caption", "video", "audio"];
  rows.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  return (
    <section aria-label="Timeline" className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-hairline bg-paper">
      <TimelineToolbar />
      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full min-w-max">
          <div className="sticky left-0 z-30 flex w-[84px] shrink-0 flex-col border-r border-hairline bg-paper sm:w-[104px]">
            <div className="sticky top-0 z-10 shrink-0 border-b border-hairline bg-paper" style={{ height: STUDIO_TIMELINE.RULER_HEIGHT }} />
            <div className="flex flex-col py-1.5" style={{ gap: STUDIO_TIMELINE.TRACK_GAP }}>
              {rows.map((track) => {
                const { label, Icon } = TRACK_LOOK[track.kind];
                return (
                  <div key={track.id} className="flex items-center gap-2 px-2 text-xs text-ink-soft sm:px-3" style={{ height: STUDIO_TIMELINE.TRACK_HEIGHTS[track.kind] }}>
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div ref={content} className="relative flex flex-col" style={{ width: Math.max(span * zoom, 1) }}>
            <TimelineRuler zoom={zoom} span={span} onScrub={scrub} />
            <div
              className={cn("relative flex flex-1 flex-col py-1.5 transition-colors", over && "bg-primary/10")}
              style={{ gap: STUDIO_TIMELINE.TRACK_GAP }}
              onDragOver={(event) => {
                if (!accepts(event)) return;
                event.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => void drop(event)}
              onPointerDown={(event) => {
                useStudio.getState().select(null);
                scrub(event.clientX);
              }}
            >
              {rows.map((track) => (
                <TrackRow key={track.id} track={track} project={project} zoom={zoom} selection={selection} onDrag={drag} />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-primary" style={{ left: currentTime * zoom }}>
              <span className="absolute -left-[5px] top-0 size-[11px] rounded-b-sm bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackRow({ track, project, zoom, selection, onDrag }: { track: Track; project: Project; zoom: number; selection: string | null; onDrag: (item: Item, mode: DragMode, seconds: number) => void }) {
  const { colour } = TRACK_LOOK[track.kind];
  return (
    <div className="relative" style={{ height: STUDIO_TIMELINE.TRACK_HEIGHTS[track.kind] }}>
      {track.items.map((item) => (
        <TimelineItem
          key={item.id}
          start={item.start}
          end={endOf(item)}
          zoom={zoom}
          label={itemLabel(item, project)}
          selected={item.id === selection}
          className={colour}
          onSelect={() => useStudio.getState().select(item.id)}
          onDrag={(mode, seconds) => onDrag(item, mode, seconds)}
          onDragEnd={() => useStudio.getState().endDrag()}
        >
          <span className={cn("pointer-events-none block truncate px-2 leading-[inherit]", track.kind === "video" ? "text-ink" : "text-white")} style={{ lineHeight: `${STUDIO_TIMELINE.TRACK_HEIGHTS[track.kind]}px` }}>
            {itemLabel(item, project)}
          </span>
        </TimelineItem>
      ))}
    </div>
  );
}
