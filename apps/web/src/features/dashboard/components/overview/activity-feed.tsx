import { Clapperboard, Send, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

import { formatInZone, relativeTime } from "@/lib/time/zone";

import { platformLabel, WINDOW_LABEL, type ActivityEvent } from "./types";

const KIND_ICON: Readonly<Record<ActivityEvent["kind"], LucideIcon>> = {
  generated: Clapperboard,
  published: Send,
};

const KIND_LABEL: Readonly<Record<ActivityEvent["kind"], string>> = {
  generated: "Video ready",
  published: "Published",
};

/**
 * What finished recently, generations and publishes in one thread.
 *
 * Only completed work appears: in-flight and failed items have their own panels
 * at the top of the page, and repeating them here would pad the list.
 */
export function ActivityFeed({
  events,
  timeZone,
}: {
  readonly events: readonly ActivityEvent[];
  readonly timeZone: string;
}): ReactNode {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
        <p className="text-xs text-ink-soft">{WINDOW_LABEL}</p>
      </div>

      {events.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-hairline px-4 py-8 text-center text-sm text-ink-soft">
          Nothing has finished in the last 30 days.
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-2xl border border-hairline">
          {events.map((event) => {
            const Icon = KIND_ICON[event.kind];
            return (
              <li
                key={event.id}
                className="flex items-center gap-3 border-b border-hairline bg-paper px-4 py-2.5 last:border-0"
              >
                <Icon className="size-4 shrink-0 text-ink-soft" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-sm text-ink">{event.title}</p>
                <p className="hidden shrink-0 text-xs text-ink-soft sm:block">
                  {KIND_LABEL[event.kind]}
                  {event.platform ? ` to ${platformLabel(event.platform)}` : ""}
                </p>
                <time
                  dateTime={event.at}
                  title={formatInZone(event.at, timeZone)}
                  className="w-20 shrink-0 text-right text-xs tabular-nums text-ink-soft"
                >
                  {relativeTime(event.at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
