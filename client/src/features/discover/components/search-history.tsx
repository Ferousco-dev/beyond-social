"use client";

import { Clock } from "lucide-react";

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
