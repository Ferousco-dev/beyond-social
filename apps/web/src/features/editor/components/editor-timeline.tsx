"use client";

import { Captions, Clapperboard, Music } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { CAPTIONS } from "@/lib/editor/data";
import { formatTimecode, msToPx, pxToMs, snapGuides, snapMs } from "@/lib/editor/timeline";

import { type ClipsState } from "../hooks/use-clips";
import { type Playback } from "../hooks/use-playback";
import { TimelineClip } from "./timeline/timeline-clip";
import { TimelineRuler } from "./timeline/timeline-ruler";
import { DEFAULT_ZOOM_INDEX, TimelineToolbar, ZOOM_LEVELS } from "./timeline/timeline-toolbar";

const SEEK_STEP_MS = 1_000;
const SNAP_THRESHOLD_PX = 8;
const RULER_STEP_MS = 6_000;

function TrackHead({ height, children }: { height: string; children: ReactNode }) {
  return (
    <div
      className={`flex ${height} items-center gap-1.5 px-3 text-[10px] font-medium uppercase tracking-wide text-ink-soft`}
    >
      {children}
    </div>
  );
}

export function EditorTimeline({ playback, clips }: { playback: Playback; clips: ClipsState }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);

  const pxPerSecond = ZOOM_LEVELS[zoomIndex] ?? ZOOM_LEVELS[DEFAULT_ZOOM_INDEX];
  const { durationMs } = clips;
  const trackWidth = msToPx(durationMs, pxPerSecond);
  const snapThresholdMs = pxToMs(SNAP_THRESHOLD_PX, pxPerSecond);

  const msFromClientX = (clientX: number): number => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return 0;
    return pxToMs(clientX - bounds.left, pxPerSecond);
  };

  const trimClip = (id: string) => (edge: "start" | "end", ms: number) => {
    const guides = snapGuides(
      clips.clips.filter((clip) => clip.id !== id),
      playback.currentMs,
    );
    clips.trim(id, edge, snapMs(ms, guides, snapThresholdMs));
  };

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

  return (
    <div className="flex shrink-0 flex-col border-t border-hairline bg-paper">
      <TimelineToolbar
        zoomIndex={zoomIndex}
        onZoomChange={setZoomIndex}
        onSplit={() => clips.split(playback.currentMs)}
        onDelete={() => clips.selectedId && clips.remove(clips.selectedId)}
        canSplit={clips.clips.some(
          (clip) =>
            playback.currentMs > clip.startMs &&
            playback.currentMs < clip.startMs + clip.durationMs,
        )}
        canDelete={clips.selectedId !== null && clips.clips.length > 1}
      />

      <div className="flex">
        <div className="w-20 shrink-0 space-y-1.5 border-r border-hairline pt-8">
          <TrackHead height="h-14">
            <Clapperboard className="size-3.5" />
            Video
          </TrackHead>
          <TrackHead height="h-7">
            <Captions className="size-3.5" />
            Text
          </TrackHead>
          <TrackHead height="h-8">
            <Music className="size-3.5" />
            Audio
          </TrackHead>
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
                clips.select(null);
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
              <div className="relative h-14">
                {clips.clips.map((clip) => (
                  <TimelineClip
                    key={clip.id}
                    clip={clip}
                    pxPerSecond={pxPerSecond}
                    selected={clips.selectedId === clip.id}
                    onSelect={() => clips.select(clip.id)}
                    onTrim={trimClip(clip.id)}
                    onMove={(startMs) => clips.move(clip.id, startMs)}
                    msFromClientX={msFromClientX}
                  />
                ))}
              </div>

              <div className="relative h-7">
                {CAPTIONS.map((caption) => (
                  <div
                    key={caption.id}
                    style={{
                      left: msToPx(caption.startMs, pxPerSecond),
                      width: msToPx(caption.endMs - caption.startMs, pxPerSecond),
                    }}
                    className="absolute inset-y-0 flex items-center truncate rounded-md border border-primary/20 bg-primary/10 px-2 text-[11px] text-primary"
                  >
                    <span className="truncate">{caption.text}</span>
                  </div>
                ))}
              </div>

              <div
                style={{ width: trackWidth }}
                className="flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-cloud px-2.5 text-[11px] text-ink-soft"
              >
                <Music className="size-3.5 shrink-0" />
                Sunrise Run
              </div>

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
