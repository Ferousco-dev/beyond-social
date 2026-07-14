import { Play } from "lucide-react";
import { type ReactNode } from "react";

export function EditorPreview(): ReactNode {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
      <div className="relative aspect-[9/16] h-full max-h-[52vh] overflow-hidden rounded-xl border border-hairline bg-black">
        <span className="absolute left-1/2 top-1/2 inline-flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black">
          <Play className="size-5 translate-x-px" />
        </span>
        <span className="absolute inset-x-3 bottom-6 flex justify-center">
          <span className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-black">
            New arrivals just dropped
          </span>
        </span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          aria-label="Play"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90"
        >
          <Play className="size-4 translate-x-px" />
        </button>
        <span className="text-xs tabular-nums text-ink-soft">0:00 / 0:30</span>
      </div>
    </div>
  );
}
