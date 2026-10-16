"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

import { type ScheduledPost } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

const DOT: Readonly<Record<ScheduledPost["status"], string>> = {
  preparing: "bg-ink-soft",
  scheduled: "bg-info",
  publishing: "bg-info",
  published: "bg-success",
  failed: "bg-destructive",
  cancelled: "bg-hairline",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  // Monday-first grid: Sunday (0) trails as 6.
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(lead).fill(null) as (number | null)[];
  for (let day = 1; day <= days; day++) cells.push(day);
  return cells;
}

/** Month grid of scheduled posts. Dots carry each day's statuses. */
export function ScheduleCalendar({ posts }: { readonly posts: readonly ScheduledPost[] }): ReactNode {
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();

  const byDay = new Map<number, ScheduledPost[]>();
  for (const post of posts) {
    const at = new Date(post.scheduled_at);
    if (at.getFullYear() !== year || at.getMonth() !== month) continue;
    const list = byDay.get(at.getDate()) ?? [];
    list.push(post);
    byDay.set(at.getDate(), list);
  }

  return (
    <section aria-label="Calendar" className="rounded-2xl border border-hairline bg-paper p-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold text-ink">
          {base.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <button
          type="button"
          onClick={() => setOffset(offset - 1)}
          aria-label="Previous month"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setOffset(0)}
          className="inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setOffset(offset + 1)}
          aria-label="Next month"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1" role="grid" aria-label="Scheduled posts by day">
        {DAY_NAMES.map((day) => (
          <p key={day} className="pb-1 text-center text-[11px] font-medium uppercase text-ink-soft">
            {day}
          </p>
        ))}
        {monthCells(year, month).map((day, index) => {
          const items = day === null ? [] : (byDay.get(day) ?? []);
          const today = day !== null && year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
          return (
            <div
              key={index}
              role="gridcell"
              aria-label={day === null ? undefined : `${year}-${month + 1}-${day}: ${items.length} posts`}
              className={cn(
                "flex min-h-11 flex-col items-center justify-start gap-1 rounded-lg px-1 py-1.5",
                today ? "bg-cloud font-medium" : "",
              )}
            >
              <span className={cn("text-xs tabular-nums", day === null ? "text-transparent" : today ? "text-ink" : "text-ink-soft")}>
                {day ?? "·"}
              </span>
              {items.length > 0 ? (
                <span className="flex gap-0.5" aria-hidden>
                  {items.slice(0, 4).map((post) => (
                    <span key={post.id} className={cn("size-1.5 rounded-full", DOT[post.status])} />
                  ))}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
