"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/** How long Undo stays available. The skill's range is 5 to 30 seconds; this is the shorter end of comfortable. */
const UNDO_MS = 8000;

interface Toast {
  readonly id: number;
  readonly message: string;
  readonly undoable: boolean;
}

let toasts: readonly Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const undoers = new Map<number, () => void>();

function publish(next: readonly Toast[]): void {
  toasts = next;
  for (const listener of listeners) listener();
}

function drop(id: number): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  undoers.delete(id);
  publish(toasts.filter((toast) => toast.id !== id));
}

/**
 * Does something now in the UI, then makes it permanent only after Undo has
 * had its window. Undo puts it back. If the real work fails, `commit` returns
 * the reason; the change is put back and the person is told.
 *
 * Closing the tab inside the window leaves the thing as it was, which is the
 * safe side to fail on.
 */
export function deferWithUndo(options: {
  readonly message: string;
  readonly onUndo: () => void;
  readonly commit: () => Promise<string | null>;
}): void {
  const id = nextId++;
  publish([...toasts, { id, message: options.message, undoable: true }]);
  undoers.set(id, () => {
    options.onUndo();
    drop(id);
  });
  timers.set(
    id,
    setTimeout(() => {
      drop(id);
      void options.commit().then((failure) => {
        if (failure === null) return;
        options.onUndo();
        notify(failure);
      });
    }, UNDO_MS),
  );
}

/** A plain message that goes away by itself. */
export function notify(message: string): void {
  const id = nextId++;
  publish([...toasts, { id, message, undoable: false }]);
  timers.set(id, setTimeout(() => drop(id), 6000));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Renders the messages. Mount it once in each signed-in frame. */
export function UndoToaster(): ReactNode {
  const items = useSyncExternalStore(subscribe, () => toasts, () => toasts);
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((toast) => (
        <div key={toast.id} role="status" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-hairline bg-ink px-4 py-2.5 text-sm text-paper shadow-card">
          <span className="min-w-0 truncate">{toast.message}</span>
          {toast.undoable ? (
            <button
              type="button"
              onClick={() => undoers.get(toast.id)?.()}
              className="shrink-0 cursor-pointer font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-paper"
            >
              Undo
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
