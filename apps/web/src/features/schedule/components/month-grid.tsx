"use client";

import { type MonthDay } from "../lib/month";
import { type PostStatus } from "../lib/types";
import { cn } from "@/lib/utils";

/**
 * A month of posting, at a glance.
 *
 * The question this answers is cadence: where the gaps are and where three
 * things are stacked on one afternoon. So a day shows dots rather than captions,
 * and the detail is a click away, because twelve legible captions will not fit
 * in a square and six truncated ones tell you nothing.
 */

/** Dots read by status without relying on colour alone; each one is labelled. */
const STATUS_DOT: Readonly<Record<PostStatus, string>> = {
  scheduled: "bg-primary",
  publishing: "bg-primary/60",
  published: "bg-ink-soft",
  failed: "bg-destructive",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Beyond this a day shows a count instead, since the dots stop being countable. */
const MAX_DOTS = 4;

export function MonthGrid({
  days,
  selected,
  onSelect,
}: {
  days: readonly MonthDay[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1" aria-hidden>
        {WEEKDAYS.map((day) => (
          <div key={day} className="pb-2 text-center text-xs font-medium text-ink-soft">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const active = day.key === selected;
          const count = day.posts.length;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelect(day.key)}
              aria-pressed={active}
              aria-label={`${day.key}, ${count} ${count === 1 ? "post" : "posts"}`}
              className={cn(
                "flex aspect-square cursor-pointer flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                active ? "border-ink bg-cloud" : "border-transparent hover:bg-cloud",
                day.inMonth ? "text-ink" : "text-ink-soft/50",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
                  day.isToday && "bg-ink font-medium text-paper",
                )}
              >
                {day.dayOfMonth}
              </span>

              {count > 0 ? (
                count > MAX_DOTS ? (
                  <span className="text-[0.625rem] font-medium tabular-nums text-ink-soft">
                    {count}
                  </span>
                ) : (
                  <span className="flex flex-wrap justify-center gap-0.5">
                    {day.posts.map((post) => (
                      <span
                        key={post.id}
                        className={cn("size-1.5 rounded-full", STATUS_DOT[post.status])}
                      />
                    ))}
                  </span>
                )
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
