"use client";

import { ArrowRight, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { type Route } from "next";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { clearDraft, draftSummary, restoreDraft, snapshotDraft, type DraftSnapshot, type DraftSummary } from "./draft";

const STEPS = 3;
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

  useEffect(() => {
    if (!discarded) return;
    const timer = window.setTimeout(() => setDiscarded(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [discarded]);

  if (discarded) {
    return (
      <div role="status" className="mt-5 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-hairline px-4 py-2 text-sm text-ink-soft">
        <span>Draft discarded.</span>
        <button
          type="button"
          onClick={() => {
            restoreDraft(discarded);
            setDiscarded(null);
            notify();
          }}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg")}
        >
          <Undo2 className="size-4" aria-hidden /> Undo
        </button>
      </div>
    );
  }
  if (!draft) return null;

  const title = draft.title || "Untitled video";
  return (
    <section
      aria-label="Unfinished video"
      className="mt-5 flex flex-col gap-3 rounded-xl border border-hairline bg-cloud/40 p-4 sm:flex-row sm:items-center sm:gap-5"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-soft">
          {variant === "assets" ? "Your video is saved" : "Unfinished video"} · Step {draft.step} of {STEPS}
        </p>
        <p className="mt-1 truncate text-sm font-medium text-ink" title={title}>
          {title}
        </p>
        <div className="mt-2.5 flex max-w-48 gap-1" aria-hidden>
          {Array.from({ length: STEPS }, (_, index) => (
            <span key={index} className={cn("h-1 flex-1 rounded-full", index < draft.step ? "bg-primary" : "bg-hairline")} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {variant === "start" ? (
          <button
            type="button"
            onClick={() => {
              setDiscarded(snapshotDraft());
              clearDraft();
              notify();
            }}
            className={cn(buttonVariants({ variant: "ghost" }), "rounded-lg text-ink-soft")}
          >
            Discard
          </button>
        ) : null}
        <Link href={"/dashboard/videos/new" as Route} prefetch className={cn(buttonVariants({ variant: "default" }), "group rounded-lg")}>
          {variant === "assets" ? "Back to my video" : "Continue"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
