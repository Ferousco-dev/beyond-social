"use client";

import { useCallback, useMemo, useState } from "react";

import { CLIPS, type Clip } from "@/lib/editor/data";
import { clamp } from "@/lib/editor/timeline";

/** Shortest a clip may be trimmed to, so an edge drag can never erase it. */
export const MIN_CLIP_MS = 500;

export type ClipEdge = "start" | "end";

export interface ClipsState {
  readonly clips: readonly Clip[];
  readonly durationMs: number;
  readonly selectedId: string | null;
  readonly select: (id: string | null) => void;
  readonly trim: (id: string, edge: ClipEdge, ms: number) => void;
  readonly split: (atMs: number) => void;
  readonly remove: (id: string) => void;
}

/**
 * Clips are trimmed within the gap left by their neighbours rather than
 * rippling the rest of the track, so an edge drag only ever affects one clip.
 */
export function useClips(): ClipsState {
  const [clips, setClips] = useState<readonly Clip[]>(CLIPS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const durationMs = useMemo(
    () => clips.reduce((end, clip) => Math.max(end, clip.startMs + clip.durationMs), 0),
    [clips],
  );

  const trim = useCallback((id: string, edge: ClipEdge, ms: number) => {
    setClips((current) => {
      const index = current.findIndex((clip) => clip.id === id);
      const clip = current[index];
      if (!clip) return current;

      const previous = current[index - 1];
      const next = current[index + 1];
      const lowerBound = previous ? previous.startMs + previous.durationMs : 0;
      const end = clip.startMs + clip.durationMs;

      let updated: Clip;
      if (edge === "start") {
        const startMs = clamp(ms, lowerBound, end - MIN_CLIP_MS);
        updated = { ...clip, startMs, durationMs: end - startMs };
      } else {
        const upperBound = next ? next.startMs : Number.POSITIVE_INFINITY;
        const endMs = clamp(ms, clip.startMs + MIN_CLIP_MS, upperBound);
        updated = { ...clip, durationMs: endMs - clip.startMs };
      }

      const nextClips = [...current];
      nextClips[index] = updated;
      return nextClips;
    });
  }, []);

  /** Cuts the clip under the playhead in two, leaving both halves in place. */
  const split = useCallback((atMs: number) => {
    setClips((current) => {
      const index = current.findIndex(
        (clip) => atMs > clip.startMs && atMs < clip.startMs + clip.durationMs,
      );
      const clip = current[index];
      if (!clip) return current;

      const head: Clip = { ...clip, durationMs: atMs - clip.startMs };
      const tail: Clip = {
        ...clip,
        id: `${clip.id}-b${current.length}`,
        startMs: atMs,
        durationMs: clip.startMs + clip.durationMs - atMs,
      };
      if (head.durationMs < MIN_CLIP_MS || tail.durationMs < MIN_CLIP_MS) return current;

      return [...current.slice(0, index), head, tail, ...current.slice(index + 1)];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setClips((current) =>
      current.length > 1 ? current.filter((clip) => clip.id !== id) : current,
    );
    setSelectedId((selected) => (selected === id ? null : selected));
  }, []);

  return { clips, durationMs, selectedId, select: setSelectedId, trim, split, remove };
}
