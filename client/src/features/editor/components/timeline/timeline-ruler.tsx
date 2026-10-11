import { buildRuler, formatTimecode, msToPx } from "@/lib/editor/timeline";
import { cn } from "@/lib/utils";

export function TimelineRuler({
  durationMs,
  pxPerSecond,
  stepMs,
}: {
  durationMs: number;
  pxPerSecond: number;
  stepMs: number;
}) {
  return (
    <div className="relative h-5" aria-hidden>
      {buildRuler(durationMs, stepMs).map((tick, index, ticks) => (
        <span
          key={tick}
          style={{ left: msToPx(tick, pxPerSecond) }}
          className={cn(
            "absolute top-0 flex flex-col gap-0.5 text-[10px] tabular-nums text-ink-soft",
            // The end ticks hug the track edges so their labels stay readable.
            index === 0 && "items-start",
            index === ticks.length - 1 && "-translate-x-full items-end",
            index > 0 && index < ticks.length - 1 && "-translate-x-1/2 items-center",
          )}
        >
          {formatTimecode(tick)}
          <span className="h-1 w-px bg-hairline" />
        </span>
      ))}
    </div>
  );
}
