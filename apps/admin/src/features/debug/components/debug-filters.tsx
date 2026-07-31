import Link from "next/link";
import { type ReactNode } from "react";

import { FAILURE_KIND_LABEL, FAILURE_KINDS, type DebugQuery } from "../query";
import { todayUtc } from "../config";

/**
 * A plain GET form, so an investigation works without JavaScript and its state
 * stays in the URL where it can be pasted into a ticket.
 */

const FIELD =
  "h-9 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function DebugFilters({ query }: { query: DebugQuery }): ReactNode {
  const filtered = query.trace !== "" || query.kind !== "all" || query.day !== todayUtc();

  return (
    <form method="get" action="/debug" className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1 space-y-1.5">
        <label htmlFor="debug-trace" className="block text-xs font-medium text-ink-soft">
          Trace id
        </label>
        <input
          id="debug-trace"
          name="trace"
          type="search"
          autoComplete="off"
          spellCheck={false}
          defaultValue={query.trace}
          placeholder="The id quoted in the support report"
          className={`${FIELD} font-mono`}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="debug-day" className="block text-xs font-medium text-ink-soft">
          Failures on (UTC)
        </label>
        <input id="debug-day" name="day" type="date" defaultValue={query.day} className={FIELD} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="debug-kind" className="block text-xs font-medium text-ink-soft">
          Kind
        </label>
        <select id="debug-kind" name="kind" defaultValue={query.kind} className={FIELD}>
          {FAILURE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {FAILURE_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-ink px-3.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Apply
        </button>
        {filtered ? (
          <Link
            href="/debug"
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
