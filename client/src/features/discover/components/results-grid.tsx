"use client";

import { ErrorHelp } from "@/components/billing/error-help";
import { type ReactNode } from "react";

import { type ScrapePlatform } from "@/lib/social-scrape/types";

import { countryName, PLATFORM_NAME } from "../lib/platforms";

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
function DiscoverArt(): ReactNode {
  const card = (x: number, y: number, tilt: number, tone: number) => (
    <g transform={`rotate(${tilt} ${x + 30} ${y + 52})`}>
      <rect x={x} y={y} width="60" height="104" rx="10" fill="var(--paper)" stroke="var(--hairline)" strokeWidth="2" />
      <rect x={x + 6} y={y + 6} width="48" height="70" rx="6" fill="var(--primary)" opacity={tone} />
      <path d={`M${x + 24} ${y + 30}l14 11l-14 11z`} fill="var(--paper)" />
      <rect x={x + 6} y={y + 84} width="34" height="5" rx="2.5" fill="var(--cloud)" />
      <rect x={x + 6} y={y + 93} width="22" height="4" rx="2" fill="var(--cloud)" />
    </g>
  );
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-xs" role="img" aria-label="Video cards and a magnifying glass">
      {card(36, 40, -9, 0.22)}
      {card(130, 28, 0, 0.35)}
      {card(224, 44, 9, 0.22)}
      <g transform="translate(206 136)">
        <circle r="30" fill="var(--paper)" stroke="var(--primary)" strokeWidth="5" />
        <circle r="30" fill="var(--primary)" opacity="0.08" />
        <path d="M22 22l24 24" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function ResultsGrid({
  children,
  detail,
  busy,
  notice,
  noticeCode,
  query,
  term,
  platform,
  countryCode,
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
  /** Why the search was refused, when a plan limit was the reason. */
  noticeCode?: string;
  /** What is in the field right now, for the searching line. */
  query: string;
  /** What the shown results were actually a search for. */
  term: string;
  platform: ScrapePlatform;
  /** The country the search was biased to, or null for an unbiased, global search. */
  countryCode: string | null;
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
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <DiscoverArt />
          <h2 className="mt-6 text-xl font-semibold tracking-tight text-ink">{notice ?? "Find what is working"}</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Search a topic and watch what is already landing on it. Open one to study how it opens, then make your own version of it.
          </p>
        </div>
        {noticeCode ? (
          <p className="mt-4 text-center">
            <ErrorHelp code={noticeCode} />
          </p>
        ) : null}
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
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <p className="text-[13px] text-ink-soft">
            Showing <span className="tabular-nums text-ink">{Math.min(shown, count)}</span> of{" "}
            <span className="tabular-nums text-ink">{count}</span> for &ldquo;{term}&rdquo; on{" "}
            {PLATFORM_NAME[platform]}
            {/* Invisible request metadata decided this result set; said here rather
                than left for the reader to notice the same term reads differently
                another time. */}
            {countryName(countryCode) ? `, biased to ${countryName(countryCode)}` : ""}
          </p>
        </div>
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
