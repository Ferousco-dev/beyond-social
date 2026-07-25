"use client";

import { useCallback, useMemo, useRef, useState } from "react";

/** How many steps back a user can go before the oldest is dropped. */
const HISTORY_LIMIT = 60;
/** Rapid edits of the same kind (dragging a slider) collapse into one step. */
const COALESCE_MS = 500;

export interface History<T> {
  readonly present: T;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /**
   * Applies a change. `label` groups rapid successive edits of the same kind
   * into a single undo step, so dragging a slider is one undo, not fifty.
   */
  readonly apply: (next: T | ((current: T) => T), label?: string) => void;
  readonly undo: () => void;
  readonly redo: () => void;
}

/**
 * Undo/redo over immutable snapshots. The model is small (a project is a few
 * hundred plain objects) so snapshotting is simpler and less error-prone than
 * maintaining inverse operations for every command.
 */
export function useHistory<T>(initial: T): History<T> {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);
  const lastEdit = useRef<{ label: string; at: number } | null>(null);

  const apply = useCallback((next: T | ((current: T) => T), label?: string) => {
    setPresent((current) => {
      const resolved = typeof next === "function" ? (next as (value: T) => T)(current) : next;
      if (Object.is(resolved, current)) return current;

      const now = Date.now();
      const previous = lastEdit.current;
      const coalesce =
        label !== undefined &&
        previous !== null &&
        previous.label === label &&
        now - previous.at < COALESCE_MS;

      lastEdit.current = label === undefined ? null : { label, at: now };

      // A coalesced edit replaces the present without adding a history entry.
      if (!coalesce) {
        setPast((stack) => [...stack, current].slice(-HISTORY_LIMIT));
        setFuture([]);
      }
      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    lastEdit.current = null;
    setPast((stack) => {
      const previous = stack[stack.length - 1];
      if (previous === undefined) return stack;
      setPresent((current) => {
        setFuture((forward) => [current, ...forward]);
        return previous;
      });
      return stack.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    lastEdit.current = null;
    setFuture((stack) => {
      const next = stack[0];
      if (next === undefined) return stack;
      setPresent((current) => {
        setPast((back) => [...back, current].slice(-HISTORY_LIMIT));
        return next;
      });
      return stack.slice(1);
    });
  }, []);

  return useMemo(
    () => ({ present, canUndo: past.length > 0, canRedo: future.length > 0, apply, undo, redo }),
    [present, past.length, future.length, apply, undo, redo],
  );
}
