import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

/**
 * The resting state of a console panel.
 *
 * Nothing in this console invents numbers. Where a page has no data source yet
 * the panel says so in plain words instead of showing a plausible looking chart,
 * so nobody mistakes scaffolding for a reading.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline px-6 py-14 text-center">
      <Icon className="size-5 text-ink-soft" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mx-auto max-w-md text-sm text-ink-soft">{description}</p>
      </div>
      {children}
    </div>
  );
}
