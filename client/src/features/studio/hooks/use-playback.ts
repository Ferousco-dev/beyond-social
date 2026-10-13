"use client";

import { useEffect, useRef } from "react";

import { endOf, projectDuration } from "../core/find.ts";
import { type Item, type Project } from "../core/types.ts";
import { drawFrame, type FrameSources } from "../lib/compose";
import { useStudio } from "../store/editor-store";

/** How far a media element may drift from the clock before it is pulled back. */
const DRIFT_SECONDS = 0.25;

type Media = Extract<Item, { kind: "video" | "audio" }>;

const mediaItems = (project: Project): Media[] =>
  project.tracks.flatMap((track) => track.items.filter((i): i is Media => i.kind === "video" || i.kind === "audio"));

function sourceTime(item: Media, time: number): number {
  return item.trimIn + (time - item.start);
}

/**
 * Plays the project into a canvas. One clock drives everything: the store's
 * `currentTime` is the truth, and each media element is steered to match it.
 */
export function usePlayback(canvas: HTMLCanvasElement | null, resolve: (src: string) => string): void {
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
          element.src = resolve(item.src);
          element.addEventListener("loadeddata", redraw);
          element.addEventListener("seeked", redraw);
          elements.current.set(item.id, element);
        }
        element.volume = Math.min(1, item.volume);
      }
      for (const [id, element] of elements.current) {
        if (wanted.has(id)) continue;
        element.pause();
        element.removeAttribute("src");
        elements.current.delete(id);
      }
      for (const track of project.tracks) {
        for (const item of track.items) {
          if (item.kind !== "image" || images.current.has(item.src)) continue;
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = redraw;
          image.src = resolve(item.src);
          images.current.set(item.src, image);
        }
      }
      redraw();
    };

    const steer = (project: Project, time: number, playing: boolean): void => {
      for (const item of mediaItems(project)) {
        const element = elements.current.get(item.id);
        if (!element) continue;
        const inside = time >= item.start && time < endOf(item);
        if (!inside || !playing) {
          if (!element.paused) element.pause();
          if (inside && Math.abs(element.currentTime - sourceTime(item, time)) > 0.04) element.currentTime = sourceTime(item, time);
          continue;
        }
        if (Math.abs(element.currentTime - sourceTime(item, time)) > DRIFT_SECONDS) element.currentTime = sourceTime(item, time);
        if (element.paused) void element.play().catch(() => undefined);
      }
    };

    const sources: FrameSources = {
      video: (id) => {
        const element = elements.current.get(id);
        return element instanceof HTMLVideoElement ? element : undefined;
      },
      image: (src) => images.current.get(src),
    };

    let project = useStudio.getState().history.present;
    sync(project);
    let last = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const state = useStudio.getState();
      if (state.history.present !== project) {
        project = state.history.present;
        sync(project);
      }
      if (state.playing) {
        const next = state.currentTime + (now - last) / 1000;
        if (next >= projectDuration(project)) {
          state.setPlaying(false);
          state.setClock(projectDuration(project));
        } else state.setClock(next);
        dirty.current = true;
      }
      last = now;
      steer(project, useStudio.getState().currentTime, state.playing);
      if (dirty.current) {
        dirty.current = false;
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
      for (const element of elements.current.values()) element.pause();
      elements.current.clear();
      images.current.clear();
    };
  }, [canvas, resolve]);
}
