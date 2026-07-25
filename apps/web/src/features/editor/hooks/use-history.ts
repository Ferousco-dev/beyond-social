"use client";

import { useCallback, useMemo, useReducer, useRef } from "react";

/** How many steps back a user can go before the oldest is dropped. */
const HISTORY_LIMIT = 60;
/** Rapid edits sharing a label (dragging a slider) collapse into one step. */
const COALESCE_MS = 500;

interface Stacks<T> {
  past: T[];
  present: T;
  future: T[];
}

type Action<T> =
  { type: "apply"; next: T; coalesce: boolean } | { type: "undo" } | { type: "redo" };

/**
 * Pure transitions over the three stacks. This is a reducer rather than three
 * `useState` calls because undo has to move a value between all three at once;
 * doing that with nested state setters is impure and drops updates when several
 * fire in the same tick.
 */
function reduce<T>(state: Stacks<T>, action: Action<T>): Stacks<T> {
  switch (action.type) {
    case "apply": {
      if (Object.is(action.next, state.present)) return state;
      // A coalesced edit replaces the present without adding a history entry.
      if (action.coalesce) return { ...state, present: action.next, future: [] };
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: action.next,
        future: [],
      };
    }
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (previous === undefined) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      const next = state.future[0];
      if (next === undefined) return state;
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: state.future.slice(1),
      };
    }
  }
}

export interface History<T> {
  readonly present: T;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /**
   * Applies a change. `label` groups rapid successive edits that share it into a
   * single undo step, so dragging a slider is one undo, not fifty, and one
   * assistant action is one undo rather than one per clip it touched.
   */
  readonly apply: (next: T | ((current: T) => T), label?: string) => void;
  readonly undo: () => void;
  readonly redo: () => void;
}

/**
 * Undo/redo over immutable snapshots. The model is small (a project is a few
 * hundred plain objects) so snapshotting is simpler and less error-prone than
 * maintaining an inverse for every command.
 */
export function useHistory<T>(initial: T): History<T> {
  const [state, dispatch] = useReducer(reduce<T>, { past: [], present: initial, future: [] });
  const lastEdit = useRef<{ label: string; at: number } | null>(null);
  // Mirrors `present` so several `apply` calls in one tick each build on the
  // previous result instead of all reading the same stale render value.
  const latest = useRef(initial);
  latest.current = state.present;

  const apply = useCallback((next: T | ((current: T) => T), label?: string) => {
    const resolved = typeof next === "function" ? (next as (value: T) => T)(latest.current) : next;
    if (Object.is(resolved, latest.current)) return;

    const now = Date.now();
    const previous = lastEdit.current;
    const coalesce =
      label !== undefined &&
      previous !== null &&
      previous.label === label &&
      now - previous.at < COALESCE_MS;

    lastEdit.current = label === undefined ? null : { label, at: now };
    latest.current = resolved;
    dispatch({ type: "apply", next: resolved, coalesce });
  }, []);

  const undo = useCallback(() => {
    lastEdit.current = null;
    dispatch({ type: "undo" });
  }, []);

  const redo = useCallback(() => {
    lastEdit.current = null;
    dispatch({ type: "redo" });
  }, []);

  return useMemo(
    () => ({
      present: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      apply,
      undo,
      redo,
    }),
    [state, apply, undo, redo],
  );
}
