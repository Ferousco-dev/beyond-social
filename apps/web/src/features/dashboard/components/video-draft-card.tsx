import { Play } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { type MessageDraft } from "@/lib/chat/thread";

export function VideoDraftCard({
  draft,
  editorHref,
}: {
  draft: MessageDraft;
  editorHref: Route;
}): ReactNode {
  const isReady = draft.status === "ready";

  return (
    <div className="mt-3 w-44">
      <Link
        href={editorHref}
        className="group relative block aspect-[9/16] overflow-hidden rounded-xl border border-hairline bg-cloud"
      >
        {draft.resultUrl ? (
          <video
            src={draft.resultUrl}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span className="absolute left-1/2 top-1/2 inline-flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-ink shadow-card">
            <Play className="size-3.5 translate-x-px" />
          </span>
        )}
        <span className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/5" />
      </Link>
      <p className="mt-2 text-xs text-ink-soft">
        {isReady ? "Draft ready · tap to edit" : "Generating..."}
      </p>
    </div>
  );
}
