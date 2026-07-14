import { ArrowLeft, Download } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PublishDialog } from "./publish-dialog";

export function EditorTopBar({ backHref, title }: { backHref: Route; title: string }): ReactNode {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={backHref}
          aria-label="Back to chat"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-cloud"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="truncate text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="hidden cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-cloud sm:inline-flex"
        >
          <Download className="size-4" />
          Export
        </button>
        <PublishDialog videoTitle={title}>
          <button
            type="button"
            className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Publish
          </button>
        </PublishDialog>
      </div>
    </header>
  );
}
