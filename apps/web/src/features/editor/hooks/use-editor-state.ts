"use client";

import { useCallback, useMemo, useState } from "react";

import { INITIAL_PROJECT } from "@/lib/editor/project";
import { clamp } from "@/lib/editor/timeline";
import {
  MIN_ITEM_MS,
  findItem,
  projectDurationMs,
  type EditorItem,
  type Project,
  type Track,
} from "@/lib/editor/types";

import { useHistory } from "./use-history";

export type ItemEdge = "start" | "end";

/** Replaces one item, leaving every other track untouched. */
function mapItem(project: Project, id: string, fn: (item: EditorItem) => EditorItem): Project {
  return {
    tracks: project.tracks.map((track) =>
      track.items.some((item) => item.id === id)
        ? { ...track, items: track.items.map((item) => (item.id === id ? fn(item) : item)) }
        : track,
    ),
  };
}

function sortByStart(items: readonly EditorItem[]): EditorItem[] {
  return [...items].sort((a, b) => a.startMs - b.startMs);
}

export interface EditorState {
  readonly project: Project;
  readonly durationMs: number;
  readonly selectedId: string | null;
  readonly selected: EditorItem | null;
  readonly selectedTrack: Track | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly select: (id: string | null) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly trim: (id: string, edge: ItemEdge, ms: number) => void;
  readonly move: (id: string, startMs: number) => void;
  readonly split: (atMs: number) => void;
  readonly remove: (id: string) => void;
  readonly duplicate: (id: string) => void;
  /** Patches the selected item's own properties (speed, volume, style, ...). */
  readonly update: <T extends EditorItem>(id: string, patch: Partial<T>, label?: string) => void;
  readonly toggleTrack: (trackId: string, key: "muted" | "hidden" | "locked") => void;
  readonly addItem: (trackId: string, item: EditorItem) => void;
}

/**
 * All editing operations, each producing a new immutable project snapshot so the
 * history hook can undo any of them. Items are constrained within their own
 * track: trimming or moving one never rewrites another track's timing.
 */
/**
 * @param initial The saved timeline, or the starting template for a project
 * that has never been edited. Undo cannot reach past it, which is correct:
 * undoing into someone else's earlier session would be surprising.
 */
export function useEditorState(initial: Project = INITIAL_PROJECT): EditorState {
  const history = useHistory<Project>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { present: project, apply } = history;

  const durationMs = useMemo(() => projectDurationMs(project), [project]);
  const found = selectedId ? findItem(project, selectedId) : undefined;

  const trim = useCallback(
    (id: string, edge: ItemEdge, ms: number) => {
      apply((current) => {
        const hit = findItem(current, id);
        if (!hit || hit.track.locked) return current;
        const { track, item } = hit;

        const ordered = sortByStart(track.items);
        const index = ordered.findIndex((candidate) => candidate.id === id);
        const previous = ordered[index - 1];
        const next = ordered[index + 1];
        const end = item.startMs + item.durationMs;

        if (edge === "start") {
          const lower = previous ? previous.startMs + previous.durationMs : 0;
          const startMs = clamp(ms, lower, end - MIN_ITEM_MS);
          return mapItem(current, id, (target) => ({
            ...target,
            startMs,
            durationMs: end - startMs,
          }));
        }

        const upper = next ? next.startMs : Number.POSITIVE_INFINITY;
        const endMs = clamp(ms, item.startMs + MIN_ITEM_MS, upper);
        return mapItem(current, id, (target) => ({
          ...target,
          durationMs: endMs - target.startMs,
        }));
      }, `trim:${id}:${edge}`);
    },
    [apply],
  );

  /** The video track is magnetic; other tracks are free-form. */
  const move = useCallback(
    (id: string, startMs: number) => {
      apply((current) => {
        const hit = findItem(current, id);
        if (!hit || hit.track.locked) return current;
        const { track, item } = hit;

        if (track.kind !== "video") {
          return mapItem(current, id, (target) => ({ ...target, startMs: Math.max(0, startMs) }));
        }

        const others = sortByStart(track.items.filter((candidate) => candidate.id !== id));
        const centre = startMs + item.durationMs / 2;
        let index = others.length;
        let cursor = 0;
        for (let i = 0; i < others.length; i += 1) {
          const other = others[i];
          if (!other) break;
          if (centre < cursor + other.durationMs / 2) {
            index = i;
            break;
          }
          cursor += other.durationMs;
        }

        const ordered = [...others.slice(0, index), item, ...others.slice(index)];
        let at = 0;
        const packed = ordered.map((candidate) => {
          const placed = { ...candidate, startMs: at };
          at += candidate.durationMs;
          return placed;
        });
        return {
          tracks: current.tracks.map((candidate) =>
            candidate.id === track.id ? { ...candidate, items: packed } : candidate,
          ),
        };
      }, `move:${id}`);
    },
    [apply],
  );

  const split = useCallback(
    (atMs: number) => {
      apply((current) => ({
        tracks: current.tracks.map((track) => {
          if (track.locked) return track;
          const index = track.items.findIndex(
            (item) => atMs > item.startMs && atMs < item.startMs + item.durationMs,
          );
          const item = track.items[index];
          if (!item) return track;

          const head = { ...item, durationMs: atMs - item.startMs };
          const tail = {
            ...item,
            id: `${item.id}-s${Math.round(atMs)}`,
            startMs: atMs,
            durationMs: item.startMs + item.durationMs - atMs,
          };
          if (head.durationMs < MIN_ITEM_MS || tail.durationMs < MIN_ITEM_MS) return track;
          return {
            ...track,
            items: [...track.items.slice(0, index), head, tail, ...track.items.slice(index + 1)],
          };
        }),
      }));
    },
    [apply],
  );

  const remove = useCallback(
    (id: string) => {
      apply((current) => ({
        tracks: current.tracks.map((track) => ({
          ...track,
          items: track.items.filter((item) => item.id !== id),
        })),
      }));
      setSelectedId((selected) => (selected === id ? null : selected));
    },
    [apply],
  );

  const duplicate = useCallback(
    (id: string) => {
      apply((current) => {
        const hit = findItem(current, id);
        if (!hit) return current;
        const copy = {
          ...hit.item,
          id: `${hit.item.id}-copy${Date.now()}`,
          startMs: hit.item.startMs + hit.item.durationMs,
        };
        return {
          tracks: current.tracks.map((track) =>
            track.id === hit.track.id ? { ...track, items: [...track.items, copy] } : track,
          ),
        };
      });
    },
    [apply],
  );

  const update = useCallback(
    <T extends EditorItem>(id: string, patch: Partial<T>, label?: string) => {
      apply(
        (current) => mapItem(current, id, (item) => ({ ...item, ...patch }) as EditorItem),
        label,
      );
    },
    [apply],
  );

  const toggleTrack = useCallback(
    (trackId: string, key: "muted" | "hidden" | "locked") => {
      apply((current) => ({
        tracks: current.tracks.map((track) =>
          track.id === trackId ? { ...track, [key]: !track[key] } : track,
        ),
      }));
    },
    [apply],
  );

  const addItem = useCallback(
    (trackId: string, item: EditorItem) => {
      apply((current) => ({
        tracks: current.tracks.map((track) =>
          track.id === trackId ? { ...track, items: [...track.items, item] } : track,
        ),
      }));
      setSelectedId(item.id);
    },
    [apply],
  );

  return {
    project,
    durationMs,
    selectedId,
    selected: found?.item ?? null,
    selectedTrack: found?.track ?? null,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    select: setSelectedId,
    undo: history.undo,
    redo: history.redo,
    trim,
    move,
    split,
    remove,
    duplicate,
    update,
    toggleTrack,
    addItem,
  };
}
