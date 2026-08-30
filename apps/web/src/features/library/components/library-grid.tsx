"use client";

import { AudioLines, Film, ImageIcon, LibraryBig, Loader2 } from "lucide-react";
import { type Route } from "next";
import { useMemo, useState, useTransition } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, type ChipOption } from "@/components/ui/filter-chips";

import { loadMoreLibraryItems } from "../actions";
import { dayHeading, groupByDay } from "../lib/group";
import { type LibraryItem, type LibraryKind } from "../types";
import { LibraryCard } from "./library-card";

const ALL = "all";

/**
 * The library, filtered in the browser, paged from the server.
 *
 * Filtering stays client-side over whatever has loaded so far: one bounded
 * page already arrived with the request, so a round trip per chip would buy
 * nothing. Paging further back does need the server, since older items were
 * never fetched at all.
 */
export function LibraryGrid({
  initialItems,
  initialCursor,
}: {
  initialItems: readonly LibraryItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<string>(ALL);

  function loadMore() {
    if (cursor === null) return;
    startTransition(async () => {
      const page = await loadMoreLibraryItems(cursor);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    });
  }

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

      {cursor !== null ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-hairline bg-paper px-4 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Load more
          </button>
        </div>
      ) : null}
    </>
  );
}
