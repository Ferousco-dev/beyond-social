"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { buildMonth, dayKey, dayLabel, monthKey, monthLabel, shiftMonth } from "../lib/month";
import { type ScheduledPost } from "../lib/types";
import { MonthGrid } from "./month-grid";
import { ScheduledPostCard } from "./scheduled-post-card";

/**
 * The schedule as a month.
 *
 * Answers a different question from the list. The list says what is next; this
 * says whether next week is empty, which is the one you need before deciding
 * what to make.
 *
 * `now` comes from the caller rather than being read here, so the grid renders
 * the same on the server and the client. Reading the clock during render is how
 * a calendar hydrates with a different day highlighted than it drew.
 */
export function ScheduleCalendar({
  posts,
  timeZone,
  now,
}: {
  posts: readonly ScheduledPost[];
  timeZone: string;
  now: string;
}) {
  const today = useMemo(() => new Date(now), [now]);
  const thisMonth = monthKey(dayKey(today, timeZone));
  const [month, setMonth] = useState(thisMonth);
  const [selected, setSelected] = useState<string | null>(null);

  const days = useMemo(
    () => buildMonth(month, posts, timeZone, today),
    [month, posts, timeZone, today],
  );

  const onSelected =
    selected === null ? [] : (days.find((day) => day.key === selected)?.posts ?? []);

  function step(by: number) {
    setMonth((current) => shiftMonth(current, by));
    // The selection belonged to the month being left, and keeping it would
    // leave a day highlighted that is no longer on screen.
    setSelected(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{monthLabel(month)}</h2>

        <div className="flex items-center gap-1">
          {/* Shown only when it would do something. Paging six months out and
              then hunting for the way back one arrow at a time was the only
              route to the current month. */}
          {month !== thisMonth ? (
            <button
              type="button"
              onClick={() => {
                setMonth(thisMonth);
                setSelected(null);
              }}
              className="mr-1 inline-flex h-8 cursor-pointer items-center rounded-full border border-hairline px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous month"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next month"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <MonthGrid days={days} selected={selected} onSelect={setSelected} />

      {selected !== null ? (
        <section aria-live="polite" className="mt-6">
          {/* The raw `2026-08-13` key was being used as the heading. */}
          <h3 className="text-sm font-semibold text-ink">{dayLabel(selected)}</h3>
          {onSelected.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">Nothing scheduled for this day.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {onSelected.map((post) => (
                <ScheduledPostCard key={post.id} post={post} timeZone={timeZone} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
