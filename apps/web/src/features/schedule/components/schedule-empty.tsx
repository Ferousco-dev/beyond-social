import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

/**
 * Nothing scheduled yet.
 *
 * Scheduling starts in the editor, not here, so an empty page that only said
 * "no posts" would leave the reader with no way to get one. It names the
 * actual route: generate a video, then publish it from the project.
 */
export function ScheduleEmpty(): ReactNode {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-paper p-10 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-cloud text-ink-soft">
        <CalendarClock className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-medium text-ink">Nothing scheduled yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        Posts arrive here from the editor. Open a project, generate a video, then choose Publish to
        pick the platforms and the time. Everything you queue shows up on this page, and you can
        change or cancel it here until it goes out.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Start a project
      </Link>
    </div>
  );
}
