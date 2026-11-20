"use client";

import { useEffect, useMemo, useState } from "react";

import { resolveSrc } from "../../lib/media-ref";
import { cachedThumbnail, loadThumbnails } from "../../lib/video-thumbnails";
import { useStudio } from "../../store/editor-store";

interface VideoFilmstripProps {
  readonly src: string;
  readonly trimIn: number;
  readonly duration: number;
  readonly speed: number;
  readonly widthPx: number;
  readonly aspectRatio: number;
}

const MAX_TILES = 12;
const STRIP_HEIGHT = 56;

export function VideoFilmstrip({ src, trimIn, duration, speed, widthPx, aspectRatio }: VideoFilmstripProps) {
  const url = useStudio((s) => resolveSrc(src, s.mediaUrls));

  const times = useMemo(() => {
    const tileW = Math.max(32, Math.min(84, Math.round(STRIP_HEIGHT * aspectRatio)));
    const count = Math.max(1, Math.min(MAX_TILES, Math.ceil(widthPx / tileW)));
    const span = duration * speed;
    return Array.from({ length: count }, (_, i) => trimIn + ((i + 0.5) / count) * span);
  }, [trimIn, duration, speed, widthPx, aspectRatio]);

  const [frames, setFrames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const initial: Record<number, string> = {};
    for (const t of times) {
      const hit = cachedThumbnail(url, t);
      if (hit) initial[t] = hit;
    }
    setFrames(initial);
    loadThumbnails(
      url,
      times,
      (t, dataUrl) => {
        if (!controller.signal.aborted) {
          setFrames((prev) => (prev[t] === dataUrl ? prev : { ...prev, [t]: dataUrl }));
        }
      },
      controller.signal,
    );
    return () => controller.abort();
  }, [url, times]);

  if (!url) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex overflow-hidden opacity-75">
      {times.map((t, index) => (
        <div key={index} className="h-full min-w-0 flex-1 overflow-hidden border-r border-black/25 last:border-r-0">
          {frames[t] ? (
            // eslint-disable-next-line @next/next/no-img-element -- local canvas data URL for timeline filmstrip
            <img src={frames[t]} alt="" draggable={false} className="size-full object-cover" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
