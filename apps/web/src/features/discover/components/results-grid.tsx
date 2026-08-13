"use client";

import { Compass } from "lucide-react";
import { type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { type ScrapePlatform } from "@/lib/social-scrape/types";

import { PLATFORM_NAME } from "../lib/platforms";

/**
 * The results, and the one being studied beside them.
 *
 * Two columns from `lg` up: the grid scrolls, the player does not. Below that
 * the player comes first and sticks to the top, so tapping a tile shows it
 * without a dialog and without scrolling anywhere.
 *
 * The layout owns the arrangement and nothing else. What goes in it is passed
 * in, which is what keeps the container above from being a six-hundred-line
 * component again.
 */
export function ResultsGrid({
  children,
  detail,
  busy,
  notice,
  query,
  term,
  platform,
  count,
  suggestions,
  onSuggestion,
  shown,
  onShowMore,
  history,
}: {
  /** The tiles. */
  children: ReactNode;
  /** The selected post's player, or null before anything is chosen. */
  detail: ReactNode;
  busy: boolean;
  notice: string | null;
  /** What is in the field right now, for the searching line. */
  query: string;
  /** What the shown results were actually a search for. */
  term: string;
  platform: ScrapePlatform;
  count: number;
  suggestions: readonly string[];
  onSuggestion: (term: string) => void;
  /** How many of `children` are on screen; the rest are behind "show more". */
  shown: number;
  onShowMore: () => void;
  /** Rendered under the suggestions when there is nothing to show yet. */
  history?: ReactNode;
}) {
  if (busy) {
    return (
      <div className="min-h-0 flex-1">
        <p role="status" className="py-4 text-sm text-ink-soft">
          Searching {PLATFORM_NAME[platform]} for &ldquo;{query.trim()}&rdquo;
        </p>
        {/* The shape of what is coming, so the page does not jump when it
            arrives. Six is a row and a bit at most sizes. */}
        <ul aria-hidden className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <div className="aspect-[9/16] animate-pulse rounded-lg border border-hairline bg-paper" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-paper" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="min-h-0 flex-1 py-10">
        <EmptyState
          icon={Compass}
          title={notice ?? "Find what is working"}
          body="Search a topic and watch what is already landing on it. Open one to study how it opens, then make your own version of it."
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestion(suggestion)}
              className="cursor-pointer rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {suggestion}
            </button>
          ))}
        </div>
        {history}
      </div>
    );
  }

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
      {/*
        First in the source below `lg`, so a tap on a tile is answered above the
        fold rather than somewhere off screen, and sticky only from `lg`, where
        it has its own column. On a phone a sticky player that tall would cover
        the results the user is scrolling to.
      */}
      <aside className="order-first w-full shrink-0 lg:order-last lg:w-[320px]">
        <div className="lg:sticky lg:top-4">{detail}</div>
      </aside>

      <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
        <p className="pb-3 text-[13px] text-ink-soft">
          Showing <span className="tabular-nums text-ink">{Math.min(shown, count)}</span> of{" "}
          <span className="tabular-nums text-ink">{count}</span> for &ldquo;{term}&rdquo; on{" "}
          {PLATFORM_NAME[platform]}
        </p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">{children}</ul>

        {/* Paged from the set already fetched, so this costs nothing: a second
            scrape would be a second charge for an overlapping page. */}
        {shown < count ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onShowMore}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-hairline bg-paper px-4 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Show more
              <span className="ml-1.5 tabular-nums text-ink-soft/70">{count - shown} left</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
