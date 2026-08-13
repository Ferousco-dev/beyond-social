"use client";

import { AudioLines, Film, ImageIcon, LibraryBig } from "lucide-react";
import { type Route } from "next";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, type ChipOption } from "@/components/ui/filter-chips";

import { dayHeading, groupByDay } from "../lib/group";
import { type LibraryItem, type LibraryKind } from "../types";
import { LibraryCard } from "./library-card";

const ALL = "all";

/**
 * The library, filtered in the browser.
 *
 * Client-side for the same reason the model market is: one bounded page of
 * items already arrived with the request, so a round trip per chip would buy
 * nothing. If this grows to real paging, the chips become search params and the
 * filter moves into the query.
 */
export function LibraryGrid({ items }: { items: readonly LibraryItem[] }) {
  const [kind, setKind] = useState<string>(ALL);

  const options = useMemo<readonly ChipOption[]>(() => {
    const count = (kind: LibraryKind) => items.filter((item) => item.kind === kind).length;
    return [
      { value: ALL, label: "All", count: items.length },
      { value: "video", label: "Videos", icon: Film, count: count("video") },
      { value: "photo", label: "Photos", icon: ImageIcon, count: count("photo") },
      { value: "audio", label: "Voice", icon: AudioLines, count: count("audio") },
    ];
  }, [items]);

  const visible = useMemo(
    () => (kind === ALL ? items : items.filter((item) => item.kind === kind)),
    [items, kind],
  );

  const days = useMemo(() => groupByDay(visible), [visible]);

  if (items.length === 0) {
    return (
      <EmptyState
        className="mt-10"
        icon={LibraryBig}
        title="Nothing here yet"
        body="Videos you generate, and the photos and voice clips you attach to a message, collect here so you can find your way back to the conversation they belong to."
        action={{ label: "Make your first video", href: "/dashboard" as Route }}
      />
    );
  }

  return (
    <>
      <div className="mt-6">
        <FilterChips label="Filter by kind" options={options} value={kind} onChange={setKind} />
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-ink-soft">Nothing of that kind yet.</p>
      ) : (
        days.map((day) => (
          <section key={day.key} className="mt-8 first:mt-6">
            {/* Sticky so the date stays readable while its own run of items
                scrolls past, which is the point at which you need it. */}
            <h2 className="sticky top-0 z-10 bg-canvas py-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
              {dayHeading(day.key)}
            </h2>
            <ul className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {day.items.map((item) => (
                <LibraryCard key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
