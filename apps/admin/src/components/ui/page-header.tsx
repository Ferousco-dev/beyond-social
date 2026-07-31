import { type ReactNode } from "react";

/**
 * The heading block every console page opens with.
 *
 * Console pages are read-mostly, so the header carries the name of the section
 * and one line saying what it is for, rather than a row of statistics that
 * would have to be invented before the data layer exists.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-6">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="max-w-2xl text-sm text-ink-soft">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
