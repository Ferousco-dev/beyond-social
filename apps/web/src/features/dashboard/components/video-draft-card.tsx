import { Play } from "lucide-react";
import { type ReactNode } from "react";

import { type VideoDraft } from "@/lib/dashboard/conversations";

export function VideoDraftCard({ draft }: { draft: VideoDraft }): ReactNode {
  const isReady = draft.status === "ready";

  return (
    <div className="mt-3 w-44">
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-hairline bg-cloud">
        <span className="absolute left-1/2 top-1/2 inline-flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-ink shadow-card">
          <Play className="size-4 translate-x-px" />
        </span>
        <span className="absolute inset-x-2 bottom-2 rounded-md bg-paper/85 px-2 py-1 text-[11px] font-medium text-ink backdrop-blur-sm">
          {draft.caption}
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {isReady ? "Draft ready · 0:30" : "Generating..."}
      </p>
    </div>
  );
}
