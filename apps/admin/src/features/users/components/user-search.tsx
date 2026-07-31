import Link from "next/link";
import { type ReactNode } from "react";

import { type UserQuery } from "../schema";
import { FIELD, LABEL, BUTTON_PRIMARY } from "./controls";

/**
 * A plain GET form, so search works without JavaScript, stays in the URL and
 * ships no client bundle. Submitting carries no cursor, which is what resets
 * the results to the newest page.
 */
export function UserSearch({ query }: { query: UserQuery }): ReactNode {
  return (
    <form method="get" action="/users" className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1 space-y-1.5">
        <label htmlFor="user-search" className={LABEL}>
          Email or name
        </label>
        <input
          id="user-search"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={query.q}
          placeholder="Any part of an address or a name"
          className={FIELD}
        />
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className={BUTTON_PRIMARY}>
          Search
        </button>
        {query.q ? (
          <Link
            href="/users"
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
