"use client";

import { ArrowRight, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { type Route } from "next";

import { buttonVariants } from "@/components/ui/button";
import { useTimeout } from "@/lib/hooks/use-timers";
import { cn } from "@/lib/utils";

import { clearDraft, draftSummary, restoreDraft, snapshotDraft, type DraftSnapshot, type DraftSummary } from "./draft";

/** How long "Undo" stays after a discard. */
const UNDO_MS = 6000;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function useDraft(): DraftSummary | null {
  return useSyncExternalStore(subscribe, draftSummary, () => null);
}

/**
 * Tells someone with an unfinished video that it is saved, and takes them
 * back to it. Shown on New Video and on Assets, where people go to add a
 * person or a voice mid-way. Discarding can be undone for a few seconds
 * instead of asking first.
 */
export function ContinueDraft({ variant }: { variant: "start" | "assets" }): ReactNode {
  const draft = useDraft();
  const [discarded, setDiscarded] = useState<DraftSnapshot | null>(null);

  useTimeout(() => setDiscarded(null), discarded ? UNDO_MS : null, discarded);

  if (discarded) {
    return (
      <div role="status" className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-hairline py-2 pl-3.5 pr-2 text-sm text-ink-soft">
        <span>Draft discarded.</span>
        <button
          type="button"
          onClick={() => {
            restoreDraft(discarded);
            setDiscarded(null);
            notify();
          }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <Undo2 aria-hidden /> Undo
        </button>
      </div>
    );
  }
  if (!draft) return null;

  const title = draft.title || "Untitled video";
  return (
    <section
      aria-label="Unfinished video"
      className="mt-5 flex items-center gap-3 rounded-xl border border-hairline bg-paper py-2 pl-3.5 pr-2"
    >
      <p className="min-w-0 flex-1 truncate text-sm text-ink" title={title}>
        <span className="text-ink-soft">{variant === "assets" ? "Saved video" : "Unfinished"} · </span>
        {title}
      </p>
      {variant === "start" ? (
        <button
          type="button"
          onClick={() => {
            setDiscarded(snapshotDraft());
            clearDraft();
            notify();
          }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Discard
        </button>
      ) : null}
      <Link href={"/dashboard/videos/new" as Route} prefetch className={cn(buttonVariants({ variant: "default", size: "sm" }), "group")}>
        {variant === "assets" ? "Back to my video" : "Continue"}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </section>
  );
}
