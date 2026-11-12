"use client";

import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { type Route } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorHelp } from "@/components/billing/error-help";
import { cn } from "@/lib/utils";

import { FALLBACK_TITLE, RETRY_SAVE_EVENT } from "../hooks/use-autosave";
import { useStudio, type SaveStatus } from "../store/editor-store";
// Only needed once someone exports, so it loads then.
const ExportDialog = dynamic(() => import("./export-dialog").then((m) => m.ExportDialog));

const SAVE: Record<SaveStatus, { label: string; tone: string }> = {
  saved: { label: "Saved", tone: "text-ink-soft" },
  pending: { label: "Unsaved changes", tone: "text-ink-soft" },
  saving: { label: "Saving", tone: "text-ink-soft" },
  error: { label: "Could not save. Your changes are kept on this device.", tone: "text-destructive" },
  conflict: { label: "Changed in another tab. Reload to continue.", tone: "text-destructive" },
};

const NOTICE_MS = 4000;

export function StudioHeader({ backHref }: { backHref: string }) {
  // Leaving loads the dashboard, which can take a moment; show that the click registered.
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const title = useStudio((s) => s.title);
  const status = useStudio((s) => s.saveStatus);
  const notice = useStudio((s) => s.notice);
  const noticeCode = useStudio((s) => s.noticeCode);
  const look = SAVE[status];

  // Warm the page behind the button so leaving does not wait on it.
  useEffect(() => router.prefetch(backHref as Route), [router, backHref]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useStudio.getState().setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <header className="flex min-h-13 shrink-0 items-center gap-2 px-3">
      <Link
        href={backHref as Route}
        aria-label="Back to new video"
        title="Back to new video"
        aria-busy={leaving}
        onClick={(event) => {
          event.preventDefault();
          if (leaving) return;
          setLeaving(true);
          // Going back uses the page the browser already holds, so it appears at once.
          if (window.history.length > 1) router.back();
          else router.push(backHref as Route);
        }}
        className="inline-flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
      >
        {leaving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <ArrowLeft className="size-4" aria-hidden />}
      </Link>
      <input
        aria-label="Project name"
        value={title}
        maxLength={120}
        onChange={(event) => useStudio.getState().setTitle(event.target.value)}
        // A project always has a name: an empty one is put back rather than failing every save.
        onBlur={(event) => {
          if (event.target.value.trim() === "") useStudio.getState().setTitle(FALLBACK_TITLE);
        }}
        className="h-8 min-w-0 max-w-64 rounded-md bg-transparent px-2 text-sm font-medium text-ink hover:bg-cloud focus-visible:bg-cloud focus-visible:outline-none"
      />
      <span role="status" className={cn("flex items-center gap-1 text-xs", look.tone)}>
        {status === "saved" ? <Check className="size-3.5" aria-hidden /> : null}
        {status === "saving" || status === "pending" ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
        {status === "error" || status === "conflict" ? <AlertCircle className="size-3.5" aria-hidden /> : null}
        <span className="hidden sm:inline">{look.label}</span>
        {status === "error" ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(RETRY_SAVE_EVENT))}
            className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
          >
            Retry now
          </button>
        ) : null}
      </span>
      {notice ? (
        <p role="alert" className="ml-auto flex items-center gap-2 truncate rounded-md bg-cloud px-3 py-1 text-xs text-ink">
          <span className="truncate">{notice}</span>
          <ErrorHelp code={noticeCode} className="shrink-0 underline underline-offset-2" />
        </p>
      ) : null}
      <div className={notice ? "" : "ml-auto"}>
        <ExportDialog />
      </div>
    </header>
  );
}
