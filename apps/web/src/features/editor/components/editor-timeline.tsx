"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { formatTimecode, msToPx, pxToMs, snapMs } from "@/lib/editor/timeline";
import { type TrackKind } from "@/lib/editor/types";

import { type EditorState } from "../hooks/use-editor-state";
import { type Playback } from "../hooks/use-playback";
import { TimelineItem } from "./timeline/timeline-item";
import { TimelineRuler } from "./timeline/timeline-ruler";
import { DEFAULT_ZOOM_INDEX, TimelineToolbar, ZOOM_LEVELS } from "./timeline/timeline-toolbar";
import { TrackHead } from "./timeline/track-head";

const SEEK_STEP_MS = 1_000;
const SNAP_THRESHOLD_PX = 8;
const RULER_STEP_MS = 6_000;

/** Video reads as the widest lane; supporting tracks are shorter. */
const TRACK_HEIGHT: Record<TrackKind, string> = {
  video: "h-14",
  overlay: "h-9",
  text: "h-8",
  audio: "h-9",
};

export function EditorTimeline({ playback, editor }: { playback: Playback; editor: EditorState }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);

  const pxPerSecond = ZOOM_LEVELS[zoomIndex] ?? ZOOM_LEVELS[DEFAULT_ZOOM_INDEX];
  const { durationMs, project } = editor;
  const trackWidth = msToPx(durationMs, pxPerSecond);
  const snapThresholdMs = pxToMs(SNAP_THRESHOLD_PX, pxPerSecond);

  const msFromClientX = (clientX: number): number => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return 0;
    return pxToMs(clientX - bounds.left, pxPerSecond);
  };

  /** Snap targets are every other item's edges plus the playhead. */
  const guidesFor = (id: string): number[] => {
    const edges = project.tracks.flatMap((track) =>
      track.items
        .filter((item) => item.id !== id)
        .flatMap((item) => [item.startMs, item.startMs + item.durationMs]),
    );
    return [...edges, playback.currentMs, 0];
  };

  const trimItem = (id: string) => (edge: "start" | "end", ms: number) =>
    editor.trim(id, edge, snapMs(ms, guidesFor(id), snapThresholdMs));

  const moveItem = (id: string) => (startMs: number) =>
    editor.move(id, snapMs(startMs, guidesFor(id), snapThresholdMs));

  const scrub = (event: ReactPointerEvent<HTMLDivElement>): void => {
    playback.seek(msFromClientX(event.clientX));
    const move = (moveEvent: PointerEvent): void => playback.seek(msFromClientX(moveEvent.clientX));
    const end = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const canSplit = project.tracks.some((track) =>
    track.items.some(
      (item) =>
        playback.currentMs > item.startMs && playback.currentMs < item.startMs + item.durationMs,
    ),
  );

  return (
    <div className="flex shrink-0 flex-col border-t border-hairline bg-paper">
      <TimelineToolbar
        zoomIndex={zoomIndex}
        onZoomChange={setZoomIndex}
        onSplit={() => editor.split(playback.currentMs)}
        onDelete={() => editor.selectedId && editor.remove(editor.selectedId)}
        onDuplicate={() => editor.selectedId && editor.duplicate(editor.selectedId)}
        onUndo={editor.undo}
        onRedo={editor.redo}
        canSplit={canSplit}
        canDelete={editor.selectedId !== null}
        canDuplicate={editor.selectedId !== null}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
      />

      <div className="flex max-h-64 overflow-y-auto">
        <div className="w-40 shrink-0 space-y-1.5 border-r border-hairline pt-8">
          {project.tracks.map((track) => (
            <TrackHead
              key={track.id}
              track={track}
              height={TRACK_HEIGHT[track.kind]}
              onToggle={(key) => editor.toggleTrack(track.id, key)}
            />
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto p-3">
          <div style={{ width: trackWidth }} className="relative min-w-full">
            <TimelineRuler
              durationMs={durationMs}
              pxPerSecond={pxPerSecond}
              stepMs={RULER_STEP_MS}
            />

            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label="Playhead"
              aria-valuemin={0}
              aria-valuemax={Math.round(durationMs)}
              aria-valuenow={Math.round(playback.currentMs)}
              aria-valuetext={formatTimecode(playback.currentMs)}
              onPointerDown={(event) => {
                editor.select(null);
                scrub(event);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") playback.seek(playback.currentMs - SEEK_STEP_MS);
                else if (event.key === "ArrowRight")
                  playback.seek(playback.currentMs + SEEK_STEP_MS);
                else if (event.key === "Home") playback.seek(0);
                else if (event.key === "End") playback.seek(durationMs);
                else return;
                event.preventDefault();
              }}
              className="relative cursor-pointer space-y-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {project.tracks.map((track) => (
                <div
                  key={track.id}
                  className={`relative ${TRACK_HEIGHT[track.kind]} ${track.hidden ? "opacity-40" : ""}`}
                >
                  {track.items.map((item) => (
                    <TimelineItem
                      key={item.id}
                      item={item}
                      trackKind={track.kind}
                      pxPerSecond={pxPerSecond}
                      selected={editor.selectedId === item.id}
                      locked={track.locked}
                      onSelect={() => editor.select(item.id)}
                      onTrim={trimItem(item.id)}
                      onMove={moveItem(item.id)}
                      msFromClientX={msFromClientX}
                    />
                  ))}
                </div>
              ))}

              <div
                aria-hidden
                style={{ left: msToPx(playback.currentMs, pxPerSecond) }}
                className="pointer-events-none absolute inset-y-0 top-0 w-px bg-primary"
              >
                <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[1px] bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
