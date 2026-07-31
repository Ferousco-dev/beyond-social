import type { ReactNode } from "react";

import { Unavailable } from "@/components/ui/card";

import { ObservedAt } from "./observed-at";

interface PanelProps {
  title: string;
  /** What the panel measures, in one line. */
  hint: string;
  /** Null when the signal could not be read, which is never rendered as zero. */
  observedAt: Date | null;
  children: ReactNode;
}

export function Panel({ title, hint, observedAt, children }: PanelProps): ReactNode {
  return (
    <section
      aria-labelledby={`${slug(title)}-heading`}
      className="rounded-xl border border-hairline bg-paper"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline px-5 py-4">
        <div>
          <h2 id={`${slug(title)}-heading`} className="text-sm font-medium text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>
        </div>
        {observedAt ? <ObservedAt at={observedAt} /> : null}
      </header>
      <div className="px-5 py-4">{observedAt ? children : <Unavailable what={title} />}</div>
    </section>
  );
}

export function PanelEmpty({ children }: { children: ReactNode }): ReactNode {
  return <p className="text-sm text-ink-soft">{children}</p>;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
