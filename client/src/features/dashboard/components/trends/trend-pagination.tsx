"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const CONTROL =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-hairline text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

export function TrendPagination({
  page,
  pageCount,
  from,
  to,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  /** 1-based index of the first and last row on screen, for the count label. */
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav aria-label="Trends pagination" className="mt-3 flex items-center justify-between gap-3">
      <p aria-live="polite" className="text-xs tabular-nums text-ink-soft">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={CONTROL}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <span className="text-xs tabular-nums text-ink-soft">
          Page {page} of {pageCount}
        </span>

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className={CONTROL}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
