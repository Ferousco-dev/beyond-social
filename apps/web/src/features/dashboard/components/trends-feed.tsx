"use client";

import { Bookmark, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { CATEGORIES, TRENDS, type Trend } from "@/lib/trends/data";
import { cn } from "@/lib/utils";

import { useSavedTrends } from "../hooks/use-saved-trends";
import { TrendCard } from "./trends/trend-card";

const SORTS = [
  { id: "growth", label: "Fastest growing" },
  { id: "views", label: "Most viewed" },
  { id: "title", label: "A to Z" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

const CHIP =
  "shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function sortTrends(trends: readonly Trend[], sort: SortId): readonly Trend[] {
  return [...trends].sort((a, b) => {
    if (sort === "views") return b.views - a.views;
    if (sort === "title") return a.title.localeCompare(b.title);
    return b.growthPercent - a.growthPercent;
  });
}

export function TrendsFeed({ onNavigate }: { onNavigate?: () => void }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("growth");
  const [savedOnly, setSavedOnly] = useState(false);
  const saved = useSavedTrends();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = TRENDS.filter((trend) => {
      const inCategory = category === "all" || trend.category === category;
      const inSearch =
        needle === "" ||
        trend.title.toLowerCase().includes(needle) ||
        trend.description.toLowerCase().includes(needle);
      const inSaved = !savedOnly || saved.ids.has(trend.id);
      return inCategory && inSearch && inSaved;
    });
    return sortTrends(matched, sort);
  }, [category, query, sort, savedOnly, saved.ids]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Trends</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Discover trending formats to remix for your content
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
          <select
            id="trend-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortId)}
            className="h-11 cursor-pointer rounded-full border border-hairline bg-paper px-4 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

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
        {CATEGORIES.map((item) => (
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
          <p className="text-sm font-medium text-ink">No trends found</p>
          <p className="mt-1 text-sm text-ink-soft">
            {savedOnly
              ? "Save a trend with the bookmark button to find it here."
              : "Try adjusting your search or category filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              saved={saved.ids.has(trend.id)}
              onToggleSave={() => saved.toggle(trend.id)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
