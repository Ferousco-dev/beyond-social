"use client";

import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { type Route } from "next";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

import { useStudio, type SaveStatus } from "../store/editor-store";
import { ExportButton } from "./export-button";

const SAVE: Record<SaveStatus, { label: string; tone: string }> = {
  saved: { label: "Saved", tone: "text-ink-soft" },
  pending: { label: "Unsaved changes", tone: "text-ink-soft" },
  saving: { label: "Saving", tone: "text-ink-soft" },
  error: { label: "Could not save. Retrying on your next edit.", tone: "text-destructive" },
  conflict: { label: "Changed in another tab. Reload to continue.", tone: "text-destructive" },
};

const NOTICE_MS = 4000;

export function StudioHeader({ backHref }: { backHref: string }) {
  const title = useStudio((s) => s.title);
  const status = useStudio((s) => s.saveStatus);
  const notice = useStudio((s) => s.notice);
  const look = SAVE[status];

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useStudio.getState().setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <header className="flex min-h-13 shrink-0 items-center gap-2 px-3">
      <Link
        href={backHref as Route}
        aria-label="Back to chat"
        title="Back to chat"
        className="inline-flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
      </Link>
      <input
        aria-label="Project name"
        value={title}
        maxLength={120}
        onChange={(event) => useStudio.getState().setTitle(event.target.value)}
        className="h-8 min-w-0 max-w-64 rounded-md bg-transparent px-2 text-sm font-medium text-ink hover:bg-cloud focus-visible:bg-cloud focus-visible:outline-none"
      />
      <span role="status" className={cn("flex items-center gap-1 text-xs", look.tone)}>
        {status === "saved" ? <Check className="size-3.5" aria-hidden /> : null}
        {status === "saving" || status === "pending" ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
        {status === "error" || status === "conflict" ? <AlertCircle className="size-3.5" aria-hidden /> : null}
        <span className="hidden sm:inline">{look.label}</span>
      </span>
      {notice ? (
        <p role="alert" className="ml-auto truncate rounded-md bg-cloud px-3 py-1 text-xs text-ink">
          {notice}
        </p>
      ) : null}
      <div className={notice ? "" : "ml-auto"}>
        <ExportButton />
      </div>
    </header>
  );
}
