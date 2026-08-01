import Link from "next/link";
import { type ReactNode } from "react";

import { usersHref, type UserPage, type UserQuery } from "../schema";

/**
 * Forward and back to the start, which is what a keyset cursor can honestly
 * offer. A cursor knows the row after the last one shown; it does not know what
 * came before this page without carrying every earlier cursor in the URL, and a
 * "Previous" that quietly returned the wrong rows would be worse than none.
 * Search, not paging, is how an operator finds a specific account.
 */

const CONTROL =
  "inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-sm text-ink " +
  "transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary";

export function UserPagination({ page, query }: { page: UserPage; query: UserQuery }): ReactNode {
  const paged = query.cursor !== "";

  if (!paged && !page.nextCursor) return null;

  return (
    <nav aria-label="Account pages" className="flex items-center justify-between gap-4">
      <p className="text-sm text-ink-soft">
        {paged ? "Showing older accounts" : "Showing the newest accounts"}
      </p>
      <div className="flex items-center gap-2">
        {paged ? (
          <Link href={usersHref(query)} className={CONTROL}>
            Back to newest
          </Link>
        ) : null}
        {page.nextCursor ? (
          <Link href={usersHref(query, page.nextCursor)} rel="next" className={CONTROL}>
            Older
          </Link>
        ) : (
          <span aria-disabled className={`${CONTROL} cursor-default opacity-40`}>
            Older
          </span>
        )}
      </div>
    </nav>
  );
}
