import Link from "next/link";
import { type ReactNode } from "react";

import { type AuditQuery } from "./query";

/**
 * A plain GET form, so filtering works without JavaScript, keeps the filters in
 * the URL, and needs no client bundle. Submitting resets to the first page
 * because the form carries no page field.
 */

const FIELD =
  "h-9 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function AuditFilters({ query }: { query: AuditQuery }): ReactNode {
  const filtered = query.actor !== "" || query.action !== "";

  return (
    <form method="get" action="/audit" className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1 space-y-1.5">
        <label htmlFor="audit-actor" className="block text-xs font-medium text-ink-soft">
          Actor
        </label>
        <input
          id="audit-actor"
          name="actor"
          type="search"
          autoComplete="off"
          defaultValue={query.actor}
          placeholder="Email of the administrator"
          className={FIELD}
        />
      </div>

      <div className="min-w-56 flex-1 space-y-1.5">
        <label htmlFor="audit-action" className="block text-xs font-medium text-ink-soft">
          Action
        </label>
        <input
          id="audit-action"
          name="action"
          type="search"
          autoComplete="off"
          defaultValue={query.action}
          placeholder="For example flag.toggle"
          className={FIELD}
        />
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
            href="/audit"
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
