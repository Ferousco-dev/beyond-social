import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ScheduleBoard } from "@/features/schedule/components/schedule-board";
import { getScheduleBoard } from "@/features/schedule/lib/queries";
import { getUserTimeZone } from "@/lib/time/user-zone";

export const metadata: Metadata = { title: "Schedule" };
// Times are relative to the moment the page is read, and a cached render would
// keep telling someone a post goes out "in 2h" long after it went.
export const dynamic = "force-dynamic";

/**
 * Everything queued for publishing.
 *
 * The queue was only ever visible as a four-row panel on the overview, which
 * could say what was next but never what was waiting behind it or what had
 * failed and why. This is the destination that answers those.
 */
export default async function SchedulePage(): Promise<ReactNode> {
  const [board, timeZone] = await Promise.all([getScheduleBoard(), getUserTimeZone()]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Schedule</h1>
        <p className="mt-1 text-sm text-ink-soft">Every post you have queued, in {timeZone}.</p>
      </header>

      <ScheduleBoard board={board} timeZone={timeZone} />
    </div>
  );
}
