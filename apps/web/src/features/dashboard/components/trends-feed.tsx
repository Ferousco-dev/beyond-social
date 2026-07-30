"use client";

import { Bookmark, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TREND_CATEGORIES } from "@/lib/trends/categories";
import { type Trend, type TrendFeed } from "@/lib/trends/queries";
import { cn } from "@/lib/utils";

import { useSavedTrends } from "../hooks/use-saved-trends";
import { TrendCard } from "./trends/trend-card";
import { TrendPagination } from "./trends/trend-pagination";
import { TrendRow } from "./trends/trend-row";

/** Above this many results the list is long enough to justify a feature row. */
const FEATURE_THRESHOLD = 4;
const PAGE_SIZE = 6;

const SORTS = [
  { id: "confidence", label: "Strongest signal" },
  { id: "newest", label: "Newest" },
  { id: "title", label: "A to Z" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

const CHIP =
  "shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function sortTrends(trends: readonly Trend[], sort: SortId): readonly Trend[] {
  return [...trends].sort((a, b) => {
    if (sort === "newest") return b.discoveredAt.localeCompare(a.discoveredAt);
    if (sort === "title") return a.title.localeCompare(b.title);
    return b.confidence - a.confidence;
  });
}

export function TrendsFeed({ feed, onNavigate }: { feed: TrendFeed; onNavigate?: () => void }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("confidence");
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const saved = useSavedTrends();

  // Any change to the result set starts the reader back at the first page.
  useEffect(() => {
    setPage(1);
  }, [category, query, sort, savedOnly]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = feed.trends.filter((trend) => {
      const inCategory = category === "all" || trend.category === category;
      const inSearch =
        needle === "" ||
        trend.title.toLowerCase().includes(needle) ||
        trend.description.toLowerCase().includes(needle);
      const inSaved = !savedOnly || saved.ids.has(trend.id);
      return inCategory && inSearch && inSaved;
    });
    return sortTrends(matched, sort);
  }, [feed.trends, category, query, sort, savedOnly, saved.ids]);

  // With only a handful of results a feature row would leave the list stranded,
  // so the split only happens once there is enough to fill both.
  const featured = visible.length > FEATURE_THRESHOLD ? visible.slice(0, 3) : [];
  const listed = visible.slice(featured.length);

  const pageCount = Math.max(1, Math.ceil(listed.length / PAGE_SIZE));
  // Clamp rather than store a corrected page, so narrowing the filters can
  // never leave the list showing nothing.
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const pageRows = listed.slice(offset, offset + PAGE_SIZE);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Trends</h1>
          <p className="mt-1 text-sm text-ink-soft">
            What is working right now, with the source for every claim
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search trends..."
              aria-label="Search trends"
              className="h-11 w-full rounded-full border border-hairline bg-paper pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
            />
          </div>

          <label className="sr-only" htmlFor="trend-sort">
            Sort trends
          </label>

          {/* `appearance-none` is what makes the pill possible: the platform
              otherwise draws its own rounded box and arrow button over ours, so
              the corners never fully round. The chevron below replaces the one
              that removes, and is not focusable, so the select stays the
              control. */}
          <div className="relative">
            <select
              id="trend-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortId)}
              className="h-11 cursor-pointer appearance-none rounded-full border border-hairline bg-paper pl-4 pr-10 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
              aria-hidden
            />
          </div>

          <button
            type="button"
            onClick={() => setSavedOnly((only) => !only)}
            aria-pressed={savedOnly}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              savedOnly
                ? "border-transparent bg-ink text-paper"
                : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink",
            )}
          >
            <Bookmark className={cn("size-4", savedOnly && "fill-current")} aria-hidden />
            Saved
            {saved.ready && saved.ids.size > 0 ? (
              <span className="tabular-nums">{saved.ids.size}</span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          aria-pressed={category === "all"}
          className={cn(
            CHIP,
            category === "all"
              ? "border-transparent bg-ink text-paper"
              : "border-hairline text-ink hover:bg-cloud",
          )}
        >
          All
        </button>
        {TREND_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            aria-pressed={category === item.id}
            className={cn(
              CHIP,
              "inline-flex items-center gap-2",
              category === item.id
                ? "border-transparent bg-ink text-paper"
                : "border-hairline text-ink hover:bg-cloud",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink">
            {feed.trends.length === 0 && !feed.configured
              ? "Trend discovery is not switched on yet"
              : "No trends found"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {/* Three genuinely different situations, so three different
                messages. "No results" for an unconfigured scraper would be a
                lie of omission. */}
            {feed.trends.length === 0 && !feed.configured
              ? "Once discovery is connected, trends found across the web appear here."
              : savedOnly
                ? "Save a trend with the bookmark button to find it here."
                : feed.trends.length === 0
                  ? "The last discovery run found nothing new. Check back after the next one."
                  : "Try adjusting your search or category filter."}
          </p>
        </div>
      ) : (
        <>
          {featured.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">Top movers</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((trend) => (
                  <TrendCard
                    key={trend.id}
                    trend={trend}
                    saved={saved.ids.has(trend.id)}
                    onToggleSave={() => saved.toggle(trend.id)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            {featured.length > 0 ? (
              <h2 className="mb-3 text-sm font-semibold text-ink">Everything else</h2>
            ) : null}
            <ul className="overflow-hidden rounded-2xl border border-hairline bg-paper">
              {pageRows.map((trend, index) => (
                <TrendRow
                  key={trend.id}
                  trend={trend}
                  rank={featured.length + offset + index + 1}
                  saved={saved.ids.has(trend.id)}
                  onToggleSave={() => saved.toggle(trend.id)}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>

            {listed.length > PAGE_SIZE ? (
              <TrendPagination
                page={currentPage}
                pageCount={pageCount}
                from={offset + 1}
                to={offset + pageRows.length}
                total={listed.length}
                onChange={setPage}
              />
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
