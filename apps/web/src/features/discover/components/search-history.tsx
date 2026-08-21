"use client";

import { Clock, X } from "lucide-react";

import { PlatformLogo } from "@/components/brand/platform-logo";

import { type PastSearch } from "../hooks/use-search-history";

/**
 * The way back to a search already run.
 *
 * Carries the platform as well as the term, because the same word on TikTok and
 * on Instagram are two different searches and a history that forgot which would
 * send half of them to the wrong place.
 *
 * These are free to reopen: the results are held for six hours server-side and
 * for the session in the browser, so a repeat is instant and costs no scrape.
 */
export function SearchHistory({
  history,
  onPick,
  onClear,
}: {
  history: readonly PastSearch[];
  onPick: (search: PastSearch) => void;
  onClear: () => void;
}) {
  if (history.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-soft">
          <Clock className="size-3" aria-hidden />
          Recent
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-xs text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Clear
        </button>
      </div>

      <ul className="flex flex-wrap gap-2">
        {history.map((search) => (
          <li key={`${search.platform}:${search.term}`}>
            <button
              type="button"
              onClick={() => onPick(search)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <PlatformLogo platform={search.platform} className="size-3" colour={false} />
              {search.term}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * What to search when somebody typed a brief instead of a term.
 *
 * Offered rather than applied. Running a search the user did not ask for, and
 * not saying so, reads as the product ignoring them; this says plainly that the
 * sentence will not find anything and hands back three things that will.
 */
export function SuggestedQueries({
  queries,
  onPick,
  onSearchAnyway,
}: {
  queries: readonly string[];
  onPick: (term: string) => void;
  onSearchAnyway: () => void;
}) {
  return (
    <section className="mt-6 rounded-xl border border-hairline bg-paper p-5">
      <h2 className="text-sm font-medium text-ink">That reads like a brief</h2>
      <p className="mt-1 max-w-lg text-sm text-ink-soft">
        Neither platform can search a sentence. These are the terms it describes, and any of them
        will find videos worth studying.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {queries.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onPick(query)}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-ink px-3.5 text-[13px] font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {query}
          </button>
        ))}

        <button
          type="button"
          onClick={onSearchAnyway}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-3.5" aria-hidden />
          Search it anyway
        </button>
      </div>
    </section>
  );
}
