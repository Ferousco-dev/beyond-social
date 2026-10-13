"use client";

import { Maximize, Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

import { projectDuration } from "../core/find.ts";
import { useCanvasDrag } from "../hooks/use-canvas-drag";
import { usePlayback } from "../hooks/use-playback";
import { formatTimecode } from "../lib/format";
import { selectProject, useStudio } from "../store/editor-store";

/** The canvas is drawn at this short side; CSS scales it to the panel. */
const PREVIEW_SHORT_SIDE = 720;

export function PreviewPanel() {
  const project = useStudio(selectProject);
  const currentTime = useStudio((s) => s.currentTime);
  const playing = useStudio((s) => s.playing);
  const frame = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  usePlayback(canvas);
  useCanvasDrag(canvas);

  const duration = projectDuration(project);
  const scale = PREVIEW_SHORT_SIDE / Math.min(project.width, project.height);
  const toggle = (): void => {
    const state = useStudio.getState();
    if (state.playing) return state.setPlaying(false);
    if (state.currentTime >= duration) state.seek(0);
    state.setPlaying(duration > 0);
  };

  return (
    <section aria-label="Preview" className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-hairline bg-paper">
      <div ref={frame} className="relative flex min-h-0 flex-1 items-center justify-center bg-canvas p-3">
        <canvas
          ref={setCanvas}
          width={Math.round(project.width * scale)}
          height={Math.round(project.height * scale)}
          aria-label="Video preview"
          className="max-h-full max-w-full rounded-sm bg-black object-contain"
          style={{ aspectRatio: `${project.width} / ${project.height}` }}
        />
      </div>
      <div className="flex h-11 shrink-0 items-center justify-between border-t border-hairline px-3 font-mono text-xs">
        <span>
          <span className="text-primary">{formatTimecode(currentTime)}</span>
          <span className="text-ink-soft"> / {formatTimecode(duration)}</span>
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause (Space)" : "Play (Space)"}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary [&_svg]:size-4"
        >
          {playing ? <Pause /> : <Play />}
        </button>
        <button
          type="button"
          onClick={() => void frame.current?.requestFullscreen()}
          aria-label="Full screen"
          title="Full screen"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary [&_svg]:size-4"
        >
          <Maximize />
        </button>
      </div>
    </section>
  );
}
