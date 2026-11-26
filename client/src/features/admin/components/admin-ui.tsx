import { type LucideIcon } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The admin console's building blocks, so every page shares one compact look:
 * a page header, number tiles, and panels with a title bar. Tight padding,
 * hairline borders, no colour except where it means something.
 */

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }): ReactNode {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

/**
 * One number: a small icon, the figure, and what it counts. With `href` it is a
 * filter; the chosen one sits on a soft grey rather than a coloured ring.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  href,
  active = false,
  tone,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  href?: Route;
  active?: boolean;
  tone?: "good" | "bad";
}): ReactNode {
  const body = (
    <>
      {Icon ? (
        <span className={cn("inline-flex size-7 items-center justify-center rounded-md", tone === "bad" ? "bg-destructive/10 text-destructive" : "bg-cloud text-ink-soft")}>
          <Icon className="size-3.5" aria-hidden />
        </span>
      ) : null}
      <span className={cn("block text-[22px] font-semibold leading-none tabular-nums tracking-tight", tone === "bad" ? "text-destructive" : "text-ink", Icon ? "mt-3" : "")}>{value}</span>
      <span className="mt-1.5 block truncate text-xs text-ink-soft">{label}</span>
    </>
  );
  const box = cn("block min-w-0 rounded-xl border bg-paper p-3.5 transition-colors", active ? "border-ink/15 bg-cloud/60" : "border-hairline");
  return href ? (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(box, !active && "hover:bg-cloud/40")}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

/** A bordered panel with a title bar; rows inside use `divide-y`. */
export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }): ReactNode {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-hairline bg-paper", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A status pill that says it in words as well as colour. */
export function StatusPill({ ok, label }: { ok: boolean | null; label: string }): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        ok === null ? "bg-cloud text-ink-soft" : ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {label}
    </span>
  );
}
