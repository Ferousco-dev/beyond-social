"use client";

import { CalendarDays, List } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { type ScheduleBoard as Board } from "../lib/queries";
import { ScheduleBoard } from "./schedule-board";
import { ScheduleCalendar } from "./schedule-calendar";

/**
 * The two ways to read a schedule.
 *
 * The list answers "what is next", the calendar answers "is next week empty".
 * Both are worth having and neither replaces the other, so this is a toggle
 * rather than a decision made on the user's behalf.
 *
 * The calendar leads, because the gap it exposes is the one people act on.
 */
type View = "calendar" | "list";

const VIEWS = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "list", label: "List", icon: List },
] as const;

export function ScheduleViews({
  board,
  timeZone,
  now,
}: {
  board: Board;
  timeZone: string;
  /** The server's clock, so the grid draws the same on both sides. */
  now: string;
}) {
  const [view, setView] = useState<View>("calendar");

  // The calendar shows everything at once: a month with only the failures
  // hidden would misrepresent how busy it was.
  const all = [...board.upcoming, ...board.published, ...board.failed];

  return (
    <div>
      <div className="mb-5 flex rounded-full border border-hairline p-0.5" role="group">
        {VIEWS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setView(option.id)}
            aria-pressed={view === option.id}
            className={cn(
              "inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              view === option.id ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            <option.icon className="size-4" aria-hidden />
            {option.label}
          </button>
        ))}
      </div>

      {view === "calendar" ? (
        <ScheduleCalendar posts={all} timeZone={timeZone} now={now} />
      ) : (
        <ScheduleBoard board={board} timeZone={timeZone} />
      )}
    </div>
  );
}
