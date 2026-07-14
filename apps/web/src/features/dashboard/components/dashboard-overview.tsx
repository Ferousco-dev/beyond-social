import { Play } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { CREDITS, HISTORY, PROJECT_GROUPS, type HistoryItem } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

const ACTIVE_PROJECTS = PROJECT_GROUPS.flatMap((group) => group.projects).slice(0, 3);

const STATUS_STYLES: Record<HistoryItem["status"], string> = {
  Published: "bg-success/10 text-success",
  Scheduled: "bg-primary/10 text-primary",
  Draft: "bg-cloud text-ink-soft",
};

export function DashboardOverview(): ReactNode {
  const remaining = CREDITS.total - CREDITS.used;
  const percent = Math.round((CREDITS.used / CREDITS.total) * 100);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">Your projects, credits, and generation history.</p>

      <div className="mt-8 rounded-2xl border border-hairline bg-paper p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-ink-soft">Video credits</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {remaining}
              <span className="text-base font-normal text-ink-soft"> / {CREDITS.total} left</span>
            </p>
          </div>
          <p className="text-xs text-ink-soft">Resets in {CREDITS.resetsInDays} days</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-cloud">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Active projects</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {ACTIVE_PROJECTS.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/c/${project.id}` as Route}
              className="rounded-xl border border-hairline bg-paper p-2.5 transition-colors hover:bg-cloud"
            >
              <div className="flex aspect-video items-center justify-center rounded-lg bg-cloud">
                <Play className="size-4 text-ink-soft" />
              </div>
              <p className="mt-2.5 truncate text-sm font-medium text-ink">{project.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Generation history</h2>
        <ul className="mt-3 overflow-hidden rounded-2xl border border-hairline">
          {HISTORY.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 border-b border-hairline bg-paper px-4 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{item.title}</p>
                <p className="truncate text-xs text-ink-soft">
                  {item.platform} · {item.when}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_STYLES[item.status],
                )}
              >
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
