import { STUDIO_TIMELINE } from "../../config";
import { formatTimecode } from "../../lib/format";

function labelStep(zoom: number): number {
  return STUDIO_TIMELINE.LABEL_STEPS.find((step) => step * zoom >= STUDIO_TIMELINE.MIN_LABEL_SPACING) ?? 300;
}

export function TimelineRuler({ zoom, span, onScrub }: { zoom: number; span: number; onScrub: (clientX: number) => void }) {
  const step = labelStep(zoom);
  const minor = step / STUDIO_TIMELINE.MINOR_TICKS_PER_LABEL;
  const ticks = Math.ceil(span / minor);

  return (
    <div
      className="sticky top-0 z-20 shrink-0 cursor-pointer border-b border-hairline bg-paper"
      style={{ height: STUDIO_TIMELINE.RULER_HEIGHT }}
      onPointerDown={(event) => onScrub(event.clientX)}
    >
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const time = i * minor;
        const major = i % STUDIO_TIMELINE.MINOR_TICKS_PER_LABEL === 0;
        return (
          <span key={i} className="pointer-events-none absolute bottom-0" style={{ left: time * zoom }}>
            <span className={major ? "block h-2.5 w-px bg-ink-soft/60" : "block h-1.5 w-px bg-ink-soft/30"} />
            {major ? (
              <span className="absolute bottom-2.5 left-1 whitespace-nowrap font-mono text-[10px] text-ink-soft">{formatTimecode(time).replace(/\.0$/, "")}</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
