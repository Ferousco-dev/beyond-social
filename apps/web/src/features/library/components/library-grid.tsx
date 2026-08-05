"use client";

import { AudioLines, Film, ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { FilterChips, type ChipOption } from "@/features/models/components/filter-chips";

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

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-hairline px-6 py-14 text-center">
        <p className="text-sm font-medium text-ink">Nothing here yet</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
          Videos you generate, and the photos and voice clips you attach to a message, collect here
          so you can find your way back to the conversation they belong to.
        </p>
      </div>
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
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => (
            <LibraryCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}
