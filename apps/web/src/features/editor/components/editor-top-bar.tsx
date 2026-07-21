import { ArrowLeft, PanelLeft } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PublishDialog } from "./publish-dialog";

export function EditorTopBar({
  backHref,
  title,
  panelOpen,
  onTogglePanel,
}: {
  backHref: Route;
  title: string;
  panelOpen: boolean;
  onTogglePanel: () => void;
}): ReactNode {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-3">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onTogglePanel}
          aria-expanded={panelOpen}
          aria-label={panelOpen ? "Hide tools" : "Show tools"}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
        >
          <PanelLeft className="size-5" />
        </button>

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
