"use client";

import { useEffect, useRef, useState } from "react";

import { endOf, projectDuration, speedOf } from "../core/find.ts";
import { type Item, type Project } from "../core/types.ts";
import { drawFrame, type FrameSources } from "../lib/compose";
import { FrameDecoder } from "../lib/frame-decoder";
import { retryWithoutCors } from "../lib/cors-retry";
import { resolveSrc } from "../lib/media-ref";
import { useStudio } from "../store/editor-store";

/** How far a media element may drift from the clock before it is pulled back. */
const DRIFT_SECONDS = 0.25;

type Media = Extract<Item, { kind: "video" | "audio" }>;

/** What went wrong with a clip, from the browser's own error code. */
function clipProblem(element: HTMLMediaElement): string {
  switch (element.error?.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return "A clip could not be loaded. Check your connection and try again.";
    case MediaError.MEDIA_ERR_DECODE:
      return "A clip could not be decoded. The file may be damaged.";
    default:
      return "A clip could not be played. The file may be damaged or in a format this browser cannot show.";
  }
}

const mediaItems = (project: Project): Media[] =>
  project.tracks.flatMap((track) => track.items.filter((i): i is Media => i.kind === "video" || i.kind === "audio"));

function sourceTime(item: Media, time: number): number {
  return item.trimIn + (time - item.start) * speedOf(item);
}

/** A seek this far from the one already in flight replaces it; closer ones are left to finish. */
const RESEEK_SECONDS = 0.5;

/**
 * Where in the file to ask the element to go. A project can record a source
 * longer than the file really is, and a seek past the end of a streamed file
 * can sit unfinished for as long as the file takes to arrive, so it is kept
 * just inside what the element reports.
 */
function seekTarget(element: HTMLMediaElement, wanted: number): number {
  return Number.isFinite(element.duration) ? Math.min(wanted, Math.max(0, element.duration - 0.05)) : wanted;
}

/**
 * Plays the project into a canvas. One clock drives everything: the store's
 * `currentTime` is the truth, and each media element is steered to match it.
 */
/** Returns true while a video under the playhead has no picture yet, so the panel can say it is loading. */
export function usePlayback(canvas: HTMLCanvasElement | null): boolean {
  const [loading, setLoading] = useState(false);
  const elements = useRef(new Map<string, HTMLVideoElement | HTMLAudioElement>());
  const images = useRef(new Map<string, HTMLImageElement>());
  const dirty = useRef(true);

  useEffect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const redraw = (): void => {
      dirty.current = true;
    };

    const sync = (project: Project): void => {
      const wanted = new Set<string>();
      for (const item of mediaItems(project)) {
        wanted.add(item.id);
        let element = elements.current.get(item.id);
        if (!element) {
          element = item.kind === "video" ? document.createElement("video") : new Audio();
          element.crossOrigin = "anonymous";
          element.preload = "auto";
          if (element instanceof HTMLVideoElement) element.playsInline = true;
          element.addEventListener("loadeddata", redraw);
          element.addEventListener("seeked", redraw);
          const failed = element;
          element.addEventListener("error", () => {
            if (retryWithoutCors(failed, () => failed.load())) return;
            useStudio.getState().setNotice(clipProblem(failed));
          });
          elements.current.set(item.id, element);
        }
        const url = resolveSrc(item.src, useStudio.getState().mediaUrls);
        // A renewed link replaces the old one only while paused, so playback is never interrupted.
        const current = element.getAttribute("src");
        if (url && current !== url && (!current || !useStudio.getState().playing)) element.src = url;
        element.volume = Math.min(1, item.volume);
        element.playbackRate = speedOf(item);
      }
      for (const [id, element] of elements.current) {
        if (wanted.has(id)) continue;
        element.pause();
        element.removeAttribute("src");
        elements.current.delete(id);
      }
      for (const track of project.tracks) {
        for (const item of track.items) {
          if (item.kind !== "image") continue;
          const url = resolveSrc(item.src, useStudio.getState().mediaUrls);
          const known = images.current.get(item.src);
          if (known && (!url || known.getAttribute("src") === url)) continue;
          const image = known ?? new Image();
          image.crossOrigin = "anonymous";
          image.onload = redraw;
          image.onerror = () => {
            retryWithoutCors(image, () => {
              const wanted = image.getAttribute("src");
              if (wanted) image.src = wanted;
            });
          };
          if (url) image.src = url;
          images.current.set(item.src, image);
        }
      }
      redraw();
    };

    /** The time each element was last asked to go to, so a seek that is still running can be told apart from a stale one. */
    const asked = new WeakMap<HTMLMediaElement, number>();
    const seekTo = (element: HTMLMediaElement, wanted: number): void => {
      const target = seekTarget(element, wanted);
      asked.set(element, target);
      element.currentTime = target;
    };
    // A seek in flight is left to finish unless the playhead has since moved well away from where it
    // was headed: asking again every frame restarts it, so a slow source would never arrive, but a
    // seek to a time nobody wants any more would otherwise hold the element until it completes.
    const stale = (element: HTMLMediaElement, wanted: number): boolean =>
      element.seeking && Math.abs((asked.get(element) ?? element.currentTime) - seekTarget(element, wanted)) > RESEEK_SECONDS;

    const steer = (project: Project, time: number, playing: boolean): void => {
      for (const item of mediaItems(project)) {
        const element = elements.current.get(item.id);
        if (!element) continue;
        const inside = time >= item.start && time < endOf(item);
        const wanted = sourceTime(item, time);
        if (!inside || !playing) {
          if (!element.paused) element.pause();
          if (inside && (stale(element, wanted) || (!element.seeking && Math.abs(element.currentTime - seekTarget(element, wanted)) > 0.04))) seekTo(element, wanted);
          continue;
        }
        if (stale(element, wanted) || (!element.seeking && element.readyState >= 2 && Math.abs(element.currentTime - seekTarget(element, wanted)) > DRIFT_SECONDS)) {
          seekTo(element, wanted);
        }
        if (element.paused) void element.play().catch(() => undefined);
      }
    };

    // Frames decoded from the file fill in wherever the element has no picture of its own.
    const decoder = new FrameDecoder(redraw);
    const decoded = (id: string): ReturnType<FrameDecoder["frameNear"]> => {
      const item = mediaItems(project).find((candidate) => candidate.id === id);
      return item ? decoder.frameNear(id, sourceTime(item, useStudio.getState().currentTime)) : undefined;
    };
    const sources: FrameSources = {
      video: (id) => {
        const element = elements.current.get(id);
        if (element instanceof HTMLVideoElement && element.readyState >= 2 && !element.seeking) {
          return { source: element, width: element.videoWidth, height: element.videoHeight };
        }
        return decoded(id) ?? (element instanceof HTMLVideoElement && element.readyState >= 2 ? { source: element, width: element.videoWidth, height: element.videoHeight } : undefined);
      },
      image: (src) => images.current.get(src),
    };

    // The maps are created once and never replaced, so holding them here is safe.
    const playing = elements.current;
    const pictures = images.current;
    let project = useStudio.getState().history.present;
    let urls = useStudio.getState().mediaUrls;
    sync(project);
    let last = performance.now();
    let frame = 0;
    /** True while a clip under the playhead has not got enough data to play on. */
    const waiting = (time: number): boolean =>
      mediaItems(project).some((item) => {
        if (time < item.start || time >= endOf(item)) return false;
        const element = elements.current.get(item.id);
        return element !== undefined && element.getAttribute("src") !== null && (element.seeking || element.readyState < 3) && !element.error;
      });
    /** A video under the playhead that has no picture yet: drawing now would flash black. */
    const pictureMissing = (time: number): boolean =>
      mediaItems(project).some((item) => {
        if (item.kind !== "video" || time < item.start || time >= endOf(item)) return false;
        const element = elements.current.get(item.id);
        return (
          element !== undefined &&
          element.getAttribute("src") !== null &&
          !element.error &&
          (element.seeking || element.readyState < 2) &&
          decoded(item.id) === undefined
        );
      });
    let waitingSince = 0;
    let shownLoading = false;
    let drawn = false;
    const tick = (now: number): void => {
      const state = useStudio.getState();
      if (state.history.present !== project || state.mediaUrls !== urls) {
        project = state.history.present;
        urls = state.mediaUrls;
        sync(project);
      }
      // The clock holds while a clip buffers, so picture, sound and playhead
      // stay together instead of the clock running ahead of the video.
      // Holding for a slow clip is capped, so a source that never buffers cannot freeze the editor.
      const hold = state.playing && waiting(state.currentTime);
      if (!hold) waitingSince = 0;
      else if (waitingSince === 0) waitingSince = now;
      if (hold && now - waitingSince < 2500) {
        dirty.current = true;
      } else if (state.playing) {
        const next = state.currentTime + (now - last) / 1000;
        if (next >= projectDuration(project)) {
          state.setPlaying(false);
          state.setClock(projectDuration(project));
        } else state.setClock(next);
        dirty.current = true;
      }
      last = now;
      steer(project, useStudio.getState().currentTime, state.playing);
      // Where the element is still seeking or buffering, decode the wanted frame directly.
      const at = useStudio.getState().currentTime;
      for (const item of mediaItems(project)) {
        if (item.kind !== "video" || at < item.start || at >= endOf(item)) continue;
        const element = elements.current.get(item.id);
        const src = element?.getAttribute("src");
        if (element && src && !element.error && (element.seeking || element.readyState < 2)) decoder.request(item.id, src, sourceTime(item, at));
      }
      const missing = pictureMissing(useStudio.getState().currentTime);
      if (missing !== shownLoading) {
        shownLoading = missing;
        setLoading(missing);
      }
      // The last good picture stays on screen until the next one is ready, never a black flash.
      if (dirty.current && !(drawn && pictureMissing(useStudio.getState().currentTime))) {
        dirty.current = false;
        drawn = true;
        drawFrame(ctx, project, useStudio.getState().currentTime, sources);
      }
      frame = requestAnimationFrame(tick);
    };
    const unsubscribe = useStudio.subscribe((s, p) => {
      if (s.currentTime !== p.currentTime || s.playing !== p.playing) dirty.current = true;
    });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      decoder.dispose();
      for (const element of playing.values()) element.pause();
      playing.clear();
      pictures.clear();
    };
  }, [canvas]);
  return loading;
}
