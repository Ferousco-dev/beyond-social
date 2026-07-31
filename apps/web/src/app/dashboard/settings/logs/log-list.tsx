import { CircleAlert, CircleCheck, CircleDashed } from "lucide-react";

import { formatInZone } from "@/lib/time/zone";

import { LOG_KIND_LABELS, type LogEntry, type LogStatus } from "./types";

const STATUS_ICON = {
  ok: CircleCheck,
  pending: CircleDashed,
  failed: CircleAlert,
} as const satisfies Record<LogStatus, typeof CircleCheck>;

const STATUS_TONE: Readonly<Record<LogStatus, string>> = {
  ok: "text-success",
  pending: "text-ink-soft",
  failed: "text-destructive",
};

const STATUS_LABEL: Readonly<Record<LogStatus, string>> = {
  ok: "Succeeded",
  pending: "In progress",
  failed: "Failed",
};

/**
 * The log itself.
 *
 * A list rather than a table: every entry has the same four fields, and on a
 * phone a four-column table becomes a horizontal scroll for no gain. Time is
 * rendered in the reader's zone, which is also the zone the day filter uses, so
 * the two agree about which day a row is on.
 */
export function LogList({ entries, timeZone }: { entries: readonly LogEntry[]; timeZone: string }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline bg-paper p-10 text-center">
        <p className="text-sm font-medium text-ink">Nothing here</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          No activity matches these filters. Try a different day, or clear the filters.
        </p>
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-hairline bg-paper">
      {entries.map((entry) => {
        const Icon = STATUS_ICON[entry.status];
        return (
          <li key={entry.id} className="flex gap-3 border-b border-hairline p-4 last:border-b-0">
            <Icon className={`mt-0.5 size-4 shrink-0 ${STATUS_TONE[entry.status]}`} aria-hidden />
            <span className="sr-only">{STATUS_LABEL[entry.status]}.</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-ink">{entry.title}</p>
                <time dateTime={entry.at} className="shrink-0 text-xs tabular-nums text-ink-soft">
                  {formatInZone(entry.at, timeZone)}
                </time>
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                {LOG_KIND_LABELS[entry.kind]}
                {entry.meta ? ` · ${entry.meta}` : ""}
              </p>
              {entry.detail ? (
                <p className="mt-2 rounded-lg border border-hairline bg-canvas px-2.5 py-1.5 font-mono text-[11px] leading-relaxed break-words text-ink-soft">
                  {entry.detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
