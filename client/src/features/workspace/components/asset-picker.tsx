"use client";

import {
  ArrowDownWideNarrow,
  CalendarClock,
  ChevronDown,
  Flower2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AssetFilterNav, type AssetFilterId } from "./asset-filter-nav";

export interface PickerAsset {
  readonly id: string;
  readonly label: string;
  readonly url: string | null;
  readonly kind: string;
}

interface AssetPickerProps {
  readonly open: boolean;
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly assets: readonly PickerAsset[];
  readonly onClose: () => void;
  readonly onSelect: (asset: PickerAsset) => void;
  readonly onUpload: (files: readonly File[]) => void;
}

export function AssetPicker({
  open,
  query,
  onQueryChange,
  assets,
  onClose,
  onSelect,
  onUpload,
}: AssetPickerProps) {
  const [filter, setFilter] = useState<AssetFilterId>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [sortKey, setSortKey] = useState<"date" | "name">("date");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFilter("all");
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const kept = assets.filter((asset) => {
      if (filter !== "all" && asset.kind !== filter) return false;
      if (needle !== "" && !asset.label.toLowerCase().includes(needle)) return false;
      return true;
    });
    const ordered = [...kept];
    if (sortKey === "name") ordered.sort((a, b) => a.label.localeCompare(b.label));
    if (sortKey === "date" && !newestFirst) ordered.reverse();
    return ordered;
  }, [assets, filter, query, newestFirst, sortKey]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assets"
      className="absolute inset-x-2 top-14 z-30 overflow-hidden rounded-3xl border border-hairline bg-paper shadow-card sm:inset-x-4"
    >
      <div className="flex flex-col gap-2 border-b border-hairline p-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setNewestFirst((first) => !first)}
          aria-label={newestFirst ? "Showing newest first" : "Showing oldest first"}
          className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <CalendarClock className="size-3.5" aria-hidden />
          {newestFirst ? "Newest first" : "Oldest first"}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search assets"
            aria-label="Search assets"
            className="h-10 w-full rounded-full border border-primary bg-paper pl-4 pr-4 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setSortKey((key) => (key === "date" ? "name" : "date"))}
          aria-label={sortKey === "date" ? "Sorting by date" : "Sorting by name"}
          className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowDownWideNarrow className="size-3.5" aria-hidden />
          {sortKey === "date" ? "Recent" : "Name"}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="grid max-h-[60vh] grid-cols-[160px_1fr] overflow-hidden">
        <nav aria-label="Asset types" className="space-y-1 overflow-y-auto border-r border-hairline p-2">
          <AssetFilterNav filter={filter} onChange={setFilter} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            aria-hidden
            tabIndex={-1}
            className="hidden"
            onChange={(event) => {
              onUpload(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Upload className="size-4" aria-hidden />
            Upload media
          </button>
        </nav>

        <div className="overflow-y-auto p-4">
          {visible.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
              <Flower2 className="size-8 text-ink-soft" aria-hidden strokeWidth={1.5} />
              <p className="text-sm text-ink">No assets found.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visible.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(asset);
                      onClose();
                    }}
                    className="group w-full cursor-pointer overflow-hidden rounded-xl border border-hairline bg-cloud/50 text-left transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="block aspect-video w-full bg-cloud">
                      {asset.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                    <span className="block truncate px-2 py-1.5 text-xs text-ink">
                      {asset.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
