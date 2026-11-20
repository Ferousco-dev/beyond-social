"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import { type Route } from "next";

import { clearDraft, draftSummary, type DraftSummary } from "./draft";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function useDraft(): DraftSummary | null {
  return useSyncExternalStore(subscribe, draftSummary, () => null);
}

/**
 * Tells someone with an unfinished video that it is saved, and takes them
 * back to it. Shown on New Video and on Assets, where people go to add a
 * person or a voice mid-way.
 */
export function ContinueDraft({ variant }: { variant: "start" | "assets" }): ReactNode {
  const draft = useDraft();
  if (!draft) return null;

  const what = draft.title ? `“${draft.title}”` : "your video";
  return (
    <div role="status" className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-sm">
      <p className="min-w-0 flex-1 text-ink">
        <span className="font-medium">{variant === "assets" ? "Your video is saved." : "You have an unfinished video."}</span>{" "}
        <span className="text-ink-soft">
          {what}, step {draft.step} of 3.
        </span>
      </p>
      <div className="flex items-center gap-3">
        <Link
          href={"/dashboard/videos/new" as Route}
          prefetch
          className="inline-flex min-h-10 items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          {variant === "assets" ? "Back to my video" : "Continue"}
        </Link>
        {variant === "start" ? (
          <button
            type="button"
            onClick={() => {
              clearDraft();
              listeners.forEach((listener) => listener());
            }}
            className="cursor-pointer text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Discard
          </button>
        ) : null}
      </div>
    </div>
  );
}
