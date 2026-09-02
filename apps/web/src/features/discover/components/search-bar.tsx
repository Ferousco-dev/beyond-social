"use client";

import { Search } from "lucide-react";
import { type FormEvent } from "react";

import { PlatformLogo } from "@/components/brand/platform-logo";
import { SCRAPE_PLATFORMS, type ScrapePlatform } from "@/lib/social-scrape/types";
import { cn } from "@/lib/utils";

import { PLATFORM_NAME } from "../lib/platforms";
import { Spinner } from "@/components/ui/spinner";

/**
 * One row: which platform, and what to look for.
 *
 * The platform used to be a pair of pill buttons floating above a separate
 * search field, which read as two unrelated controls stacked by accident. They
 * are one decision, so they share one surface: a segmented control seated
 * inside the field's own border, on the same baseline.
 */
export function SearchBar({
  query,
  onQueryChange,
  platform,
  onPlatformChange,
  onSubmit,
  busy,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  platform: ScrapePlatform;
  onPlatformChange: (platform: ScrapePlatform) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* A segmented control rather than two buttons: these are exclusive, and
          the shared track is what says so without a label. */}
      <div
        role="group"
        aria-label="Platform to search"
        className="inline-flex shrink-0 rounded-lg border border-hairline bg-paper p-0.5"
      >
        {SCRAPE_PLATFORMS.map((option) => {
          const current = option === platform;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={current}
              onClick={() => onPlatformChange(option)}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                current ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              <PlatformLogo platform={option} className="size-3.5" colour={current} />
              {PLATFORM_NAME[option]}
            </button>
          );
        })}
      </div>

      <div className="relative min-w-0 flex-1">
        <label htmlFor="social-search" className="sr-only">
          Search {PLATFORM_NAME[platform]}
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          id="social-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={`Search ${PLATFORM_NAME[platform]}`}
          className="h-9 w-full rounded-lg border border-hairline bg-paper pl-9 pr-24 text-sm text-ink placeholder:text-ink-soft focus-visible:border-primary focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={busy || query.trim().length < 2}
          title={query.trim().length < 2 ? "Type at least two characters" : "Search"}
          className="absolute right-1 top-1/2 inline-flex h-7 -translate-y-1/2 cursor-pointer items-center gap-1.5 rounded-md bg-ink px-3 text-[13px] font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Spinner className="size-3.5" /> : null}
          Search
        </button>
      </div>
    </form>
  );
}
