import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

/**
 * The one container the overview panels share.
 *
 * A single primitive rather than three near-identical cards, so the three
 * columns of the status row stay on the same rhythm as each other.
 */
export function Panel({
  title,
  meta,
  children,
}: {
  readonly title: string;
  /** The timeframe or total. Every panel states one, so no count floats free. */
  readonly meta: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <section className="flex flex-col rounded-2xl border border-hairline bg-paper">
      <header className="flex items-baseline justify-between gap-3 px-4 pb-3 pt-3.5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="shrink-0 text-xs tabular-nums text-ink-soft">{meta}</p>
      </header>
      {children}
    </section>
  );
}

/** Rows sit flush to the panel edge, separated by hairlines rather than gaps. */
export function PanelList({ children }: { readonly children: ReactNode }): ReactNode {
  return <ul className="border-t border-hairline">{children}</ul>;
}

export function PanelRow({ children }: { readonly children: ReactNode }): ReactNode {
  return <li className="border-b border-hairline last:border-0">{children}</li>;
}

/** A concise message and nothing else: no illustration, no invented figure. */
export function PanelEmpty({
  icon: Icon,
  children,
}: {
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-1 flex-col items-start gap-2 border-t border-hairline px-4 py-5">
      <Icon className="size-4 text-ink-soft" aria-hidden />
      <p className="text-sm text-ink-soft">{children}</p>
    </div>
  );
}

/** Shown under a capped list when more rows exist than the panel can hold. */
export function PanelMore({ hidden }: { readonly hidden: number }): ReactNode {
  if (hidden <= 0) return null;
  return (
    <p className="border-t border-hairline px-4 py-2 text-xs text-ink-soft">
      {hidden} more not shown
    </p>
  );
}
