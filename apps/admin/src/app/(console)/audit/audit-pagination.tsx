import Link from "next/link";
import { type ReactNode } from "react";

import { auditHref, PAGE_SIZE, type AuditQuery } from "./query";

/**
 * Previous and next only. The log is append only and read newest first, so page
 * numbers past the first few are a way of getting lost rather than a way of
 * finding something; the filters are the real navigation.
 */

const CONTROL =
  "inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-sm text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Disabled({ children }: { children: ReactNode }): ReactNode {
  return (
    <span aria-disabled className={`${CONTROL} cursor-default opacity-40`}>
      {children}
    </span>
  );
}

export function AuditPagination({
  query,
  total,
}: {
  query: AuditQuery;
  total: number;
}): ReactNode {
  const first = total === 0 ? 0 : (query.page - 1) * PAGE_SIZE + 1;
  const last = Math.min(query.page * PAGE_SIZE, total);
  const hasNext = query.page * PAGE_SIZE < total;

  return (
    <nav aria-label="Audit log pages" className="flex items-center justify-between gap-4">
      <p className="text-sm text-ink-soft" aria-live="polite">
        {total === 0 ? "No entries" : `Showing ${first} to ${last} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        {query.page > 1 ? (
          <Link href={auditHref(query, query.page - 1)} rel="prev" className={CONTROL}>
            Previous
          </Link>
        ) : (
          <Disabled>Previous</Disabled>
        )}
        {hasNext ? (
          <Link href={auditHref(query, query.page + 1)} rel="next" className={CONTROL}>
            Next
          </Link>
        ) : (
          <Disabled>Next</Disabled>
        )}
      </div>
    </nav>
  );
}
