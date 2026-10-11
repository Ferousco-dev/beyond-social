import { SAFE_AREAS, safeAreaStyle } from "@/lib/editor/safe-areas";

/**
 * Marks where the host app covers the frame, so captions and product shots can
 * be kept clear of it. Decorative: the same information is in the toggle label.
 */
export function PreviewSafeAreas() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {SAFE_AREAS.map((area) => (
        <div
          key={area.id}
          style={safeAreaStyle(area)}
          className="absolute border border-dashed border-white/35 bg-black/25"
        >
          <span className="absolute inset-x-1 bottom-1 truncate text-[9px] font-medium leading-tight text-white/60">
            {area.label}
          </span>
        </div>
      ))}
    </div>
  );
}
