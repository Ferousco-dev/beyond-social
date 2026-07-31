import { type Route } from "next";
import Link from "next/link";

import { LOG_KIND_LABELS, LOG_KINDS, type LogFilter } from "./types";

const BASE = "/dashboard/settings/logs";

/**
 * Builds a filter URL. Changing a filter always returns to page 1: keeping the
 * offset would land the reader in the middle of a different, shorter list, or
 * past the end of it.
 */
export function logHref(filter: Partial<LogFilter>): Route {
  const params = new URLSearchParams();
  if (filter.kind) params.set("kind", filter.kind);
  if (filter.day) params.set("day", filter.day);
  if (filter.page && filter.page > 1) params.set("page", String(filter.page));
  const query = params.toString();
  return (query === "" ? BASE : `${BASE}?${query}`) as Route;
}

const tabBase =
  "inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const tabOn = "border-ink bg-ink text-canvas";
const tabOff = "border-hairline text-ink-soft hover:bg-cloud hover:text-ink";

/**
 * Kind tabs and a day picker.
 *
 * A plain GET form rather than a client component with state. The filters are
 * already in the URL, which makes a filtered view shareable and the back button
 * meaningful, and it keeps working before hydration.
 */
export function LogFilters({ filter }: { filter: LogFilter }) {
  return (
    <div className="space-y-3">
      <nav aria-label="Filter by kind">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href={logHref({ day: filter.day })}
              aria-current={filter.kind === undefined ? "page" : undefined}
              className={`${tabBase} ${filter.kind === undefined ? tabOn : tabOff}`}
            >
              All
            </Link>
          </li>
          {LOG_KINDS.map((kind) => (
            <li key={kind}>
              <Link
                href={logHref({ kind, day: filter.day })}
                aria-current={filter.kind === kind ? "page" : undefined}
                className={`${tabBase} ${filter.kind === kind ? tabOn : tabOff}`}
              >
                {LOG_KIND_LABELS[kind]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form method="get" action={BASE} className="flex flex-wrap items-end gap-2">
        {filter.kind ? <input type="hidden" name="kind" value={filter.kind} /> : null}
        <div>
          <label htmlFor="log-day" className="block text-xs font-medium text-ink">
            Day
          </label>
          <input
            id="log-day"
            type="date"
            name="day"
            defaultValue={filter.day ?? ""}
            className="mt-1 h-11 rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-lg border border-hairline px-3.5 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Apply
        </button>
        {filter.day ? (
          <Link
            href={logHref({ kind: filter.kind })}
            className="inline-flex h-11 items-center rounded-lg px-2 text-xs text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Clear day
          </Link>
        ) : null}
      </form>
    </div>
  );
}
