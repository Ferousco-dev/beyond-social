import { Music } from "lucide-react";

import { MUSIC } from "@/lib/editor/data";
import { formatTimecode } from "@/lib/editor/timeline";

export function MusicPanel() {
  return (
    <ul className="space-y-1">
      {MUSIC.map((track) => (
        <li
          key={track.id}
          className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-cloud"
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-cloud text-ink-soft">
              <Music className="size-4" />
            </span>
            <span className="text-sm text-ink">{track.title}</span>
          </div>
          <span className="text-xs tabular-nums text-ink-soft">
            {formatTimecode(track.durationMs)}
          </span>
        </li>
      ))}
    </ul>
  );
}
