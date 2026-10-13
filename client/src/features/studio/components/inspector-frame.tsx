import { SlidersHorizontal } from "lucide-react";
import { type ReactNode } from "react";

export function InspectorFrame({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Inspector" className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-hairline bg-paper">
      <h2 className="flex h-11 shrink-0 items-center gap-2 border-b border-hairline px-3 text-sm text-ink-soft">
        <SlidersHorizontal className="size-4" aria-hidden />
        Inspector
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}
