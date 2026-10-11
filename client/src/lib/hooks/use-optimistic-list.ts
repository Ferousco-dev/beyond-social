"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A list that acts before the server answers.
 *
 * Deleting something should look instant, because the decision was already made
 * by the time the button was pressed: the round trip is our problem, not the
 * user's. So the row goes immediately and the request happens behind it.
 *
 * The rollback is the part that makes this honest rather than a lie. A change
 * the database refused has to come back, and it has to come back where it was:
 * a row that reappears at the bottom of a list reads as a second, different bug.
 *
 * Generalised from the sidebar, which has worked this way since it was built and
 * was the only place that did. Everything else waited on a revalidation before
 * admitting anything had happened.
 */

export interface Outcome {
  readonly ok: boolean;
  readonly message?: string;
}

export interface OptimisticList<T> {
  readonly items: readonly T[];
  readonly error: string | null;
  readonly setError: (message: string | null) => void;
  /** Removes it now, runs the action behind it, and puts it back on refusal. */
  readonly remove: (item: T, action: () => Promise<Outcome>) => Promise<void>;
  /** Empties the list now, and restores the lot on refusal. */
  readonly clear: (action: () => Promise<Outcome>) => Promise<void>;
}

export function useOptimisticList<T extends { readonly id: string }>(
  initial: readonly T[],
): OptimisticList<T> {
  const [items, setItems] = useState<readonly T[]>(() => [...initial]);
  const [error, setError] = useState<string | null>(null);

  /*
   * Each new server render replaces the list. That is what settles an optimistic
   * removal onto the persisted truth, and what lets a row added elsewhere
   * appear. `initial` is a fresh array only when the server actually
   * re-rendered, so this does not fight the updates below.
   */
  useEffect(() => {
    setItems([...initial]);
  }, [initial]);

  const remove = useCallback(
    async (item: T, action: () => Promise<Outcome>) => {
      setError(null);

      /*
       * Read outside the updater on purpose. A state updater has to be pure and
       * strict mode calls it twice, so finding the index in there would be a
       * second lookup against a list that had already changed.
       */
      const index = items.findIndex((entry) => entry.id === item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));

      const result = await action();
      if (result.ok) return;

      setItems((current) => {
        // Already back, because the server re-rendered while this was in flight.
        if (current.some((entry) => entry.id === item.id)) return current;
        const restored = [...current];
        restored.splice(index < 0 ? restored.length : index, 0, item);
        return restored;
      });
      setError(result.message ?? "That could not be saved.");
    },
    [items],
  );

  const clear = useCallback(
    async (action: () => Promise<Outcome>) => {
      setError(null);
      const previous = items;
      setItems([]);

      const result = await action();
      if (result.ok) return;

      setItems(previous);
      setError(result.message ?? "That could not be saved.");
    },
    [items],
  );

  return { items, error, setError, remove, clear };
}
