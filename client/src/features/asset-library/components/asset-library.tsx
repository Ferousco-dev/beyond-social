"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { ASSET_KINDS, KIND_META, type AssetKind, type LibraryAsset } from "../types";
import { useAssetLibrary } from "../use-asset-library";
import { AddAssetPanel } from "./add-asset-panel";
import { AssetTile } from "./asset-tile";

type Tab = AssetKind | "all";
const TABS: readonly Tab[] = ["all", ...ASSET_KINDS];

/** Every asset, filed by kind, with adding and editing done in place. */
export function AssetLibrary({ initial }: { initial: readonly LibraryAsset[] }) {
  const { assets, error, dismissError, add, relabel, consent, remove } = useAssetLibrary(initial);
  const [tab, setTab] = useState<Tab>("all");
  const [adding, setAdding] = useState(false);
  const shown = tab === "all" ? assets : assets.filter((asset) => asset.kind === tab);
  const count = (kind: Tab): number => (kind === "all" ? assets.length : assets.filter((asset) => asset.kind === kind).length);
  const addLabel = tab === "all" || tab === "other" ? "Add asset" : `Add ${KIND_META[tab].singular}`;

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline">
        <div role="tablist" aria-label="Asset kinds" className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={cn(
                "inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                tab === item ? "border-ink font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {item === "all" ? "All" : KIND_META[item].plural}
              <span className="text-xs tabular-nums text-ink-soft">{count(item)}</span>
            </button>
          ))}
        </div>
        {adding ? null : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mb-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-4" aria-hidden />
            {addLabel}
          </button>
        )}
      </div>

      {error ? (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-ink">
          {error}
          <button type="button" onClick={dismissError} aria-label="Dismiss" className="cursor-pointer text-ink-soft hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {adding ? (
        <AddAssetPanel
          initialKind={tab === "all" ? "face" : tab}
          onClose={() => setAdding(false)}
          onAdd={(kind, label, file) => {
            setAdding(false);
            setTab((current) => (current === "all" || current === kind ? current : kind));
            void add(kind, label, file);
          }}
        />
      ) : null}

      {shown.length === 0 && !adding ? (
        <EmptyState tab={tab} onAdd={() => setAdding(true)} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {shown.map((asset) => (
            <AssetTile
              key={asset.id}
              asset={asset}
              showKind={tab === "all"}
              onRelabel={(label) => void relabel(asset, label)}
              onConsent={() => void consent(asset)}
              onRemove={() => void remove(asset)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  const meta = tab === "all" ? null : KIND_META[tab];
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-hairline px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">{meta ? `No ${meta.plural.toLowerCase()} yet` : "Your library is empty"}</p>
      <p className="max-w-sm text-sm text-ink-soft">
        {meta ? meta.hint : "Add faces, voices, products and places one at a time. Pick any of them when you make a video."}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-1 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-hairline px-3.5 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Plus className="size-4" aria-hidden />
        {meta && tab !== "other" ? `Add a ${meta.singular}` : "Add an asset"}
      </button>
    </div>
  );
}
