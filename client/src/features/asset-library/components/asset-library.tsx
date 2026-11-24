"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState, type ReactNode } from "react";
import { FolderPlus, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { ASSET_KINDS, KIND_META, MAX_GROUP_NAME, type AssetKind, type LibraryAsset, type LibraryGroup } from "../types";
import { useAssetLibrary, type ShownAsset } from "../use-asset-library";
import { AddAssetPanel } from "./add-asset-panel";
import { AssetTile } from "./asset-tile";

type Tab = AssetKind | "all";
const TABS: readonly Tab[] = ["all", ...ASSET_KINDS];

/** Where the add panel files the new asset: a group, or none. */
type Adding = { readonly groupId: string | null } | null;

/**
 * Every asset, shown under the group it is filed in, with the rest below.
 * The kind tabs filter inside every group. Adding, renaming and filing all
 * happen in place.
 */
export function AssetLibrary({ initial, initialGroups = [] }: { initial: readonly LibraryAsset[]; initialGroups?: readonly LibraryGroup[] }) {
  const library = useAssetLibrary(initial, initialGroups);
  const { assets, groups, error, dismissError } = library;
  const [tab, setTab] = useState<Tab>("all");
  const [adding, setAdding] = useState<Adding>(null);
  const [naming, setNaming] = useState(false);

  const ofTab = (asset: ShownAsset): boolean => tab === "all" || asset.kind === tab;
  const shown = assets.filter(ofTab);
  const count = (kind: Tab): number => (kind === "all" ? assets.length : assets.filter((asset) => asset.kind === kind).length);
  const addLabel = tab === "all" || tab === "other" ? "Add asset" : `Add ${KIND_META[tab].singular}`;
  const known = new Set(groups.map((g) => g.id));
  const ungrouped = shown.filter((asset) => !asset.group_id || !known.has(asset.group_id));

  const tiles = (list: readonly ShownAsset[]): ReactNode => (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {list.map((asset) => (
        <AssetTile
          key={asset.id}
          asset={asset}
          showKind={tab === "all"}
          groups={groups}
          onRelabel={(label) => void library.relabel(asset, label)}
          onConsent={() => void library.consent(asset)}
          onMove={(groupId) => void library.move(asset, groupId)}
          onRemove={() => library.remove(asset)}
        />
      ))}
    </ul>
  );

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
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-hairline px-3 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary"
          >
            <FolderPlus className="size-4" aria-hidden />
            New group
          </button>
          {adding ? null : (
            <button
              type="button"
              onClick={() => setAdding({ groupId: null })}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="size-4" aria-hidden />
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-ink">
          {error}
          <button type="button" onClick={dismissError} aria-label="Dismiss" className="cursor-pointer text-ink-soft hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {naming ? (
        <GroupNameForm
          submitLabel="Create group"
          onCancel={() => setNaming(false)}
          onSubmit={async (name) => {
            const group = await library.createGroup(name);
            if (group) setNaming(false);
          }}
        />
      ) : null}

      {adding ? (
        <AddAssetPanel
          key={`${tab}-${adding.groupId ?? ""}`}
          initialKind={tab === "all" ? "face" : tab}
          lockKind={tab !== "all"}
          groups={groups}
          initialGroupId={adding.groupId}
          onClose={() => setAdding(null)}
          onAdd={(kind, label, file, groupId) => {
            setAdding(null);
            setTab((current) => (current === "all" || current === kind ? current : kind));
            void library.add(kind, label, file, groupId);
          }}
        />
      ) : null}

      {assets.length === 0 && groups.length === 0 && !adding ? (
        <EmptyState tab={tab} onAdd={() => setAdding({ groupId: null })} />
      ) : (
        <>
          {groups.map((group) => (
            <GroupSection
              key={group.id}
              group={group}
              items={shown.filter((asset) => asset.group_id === group.id)}
              onAdd={() => setAdding({ groupId: group.id })}
              onRename={(name) => void library.renameGroup(group, name)}
              onDelete={() => library.removeGroup(group)}
            >
              {tiles(shown.filter((asset) => asset.group_id === group.id))}
            </GroupSection>
          ))}
          {ungrouped.length > 0 ? (
            <section aria-label={groups.length > 0 ? "Not in a group" : "Assets"} className="flex flex-col gap-3">
              {groups.length > 0 ? <h2 className="text-sm font-semibold text-ink">Not in a group</h2> : null}
              {tiles(ungrouped)}
            </section>
          ) : groups.length === 0 && !adding ? (
            <EmptyState tab={tab} onAdd={() => setAdding({ groupId: null })} />
          ) : null}
        </>
      )}
    </div>
  );
}

/** One group: its name, what is in it, and its own add button. */
function GroupSection({
  group,
  items,
  onAdd,
  onRename,
  onDelete,
  children,
}: {
  group: LibraryGroup;
  items: readonly ShownAsset[];
  onAdd: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const [renaming, setRenaming] = useState(false);
  const headingId = `group-${group.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-xl border border-hairline p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        {renaming ? (
          <GroupNameForm
            compact
            initial={group.name}
            submitLabel="Save"
            onCancel={() => setRenaming(false)}
            onSubmit={(name) => {
              setRenaming(false);
              if (name !== group.name) onRename(name);
            }}
          />
        ) : (
          <h2 id={headingId} className="flex min-w-0 items-baseline gap-2 text-sm font-semibold text-ink">
            <span className="truncate">{group.name}</span>
            <span className="shrink-0 text-xs font-normal tabular-nums text-ink-soft">
              {items.length} {items.length === 1 ? "asset" : "assets"}
            </span>
          </h2>
        )}
        {renaming ? null : (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Plus className="size-4" aria-hidden />
              Add
            </button>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger
                aria-label={`Options for ${group.name}`}
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-40 rounded-lg border border-hairline bg-paper p-1 text-ink shadow-card">
                  <DropdownMenu.Item onSelect={() => setRenaming(true)} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-cloud">
                    <Pencil className="size-4 text-ink-soft" aria-hidden />
                    Rename
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={onDelete} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-cloud">
                    <Trash2 className="size-4" aria-hidden />
                    Delete group
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )}
      </div>
      {items.length > 0 ? (
        children
      ) : (
        <p className="rounded-lg border border-dashed border-hairline px-3 py-5 text-center text-sm text-ink-soft">
          Nothing here yet. Add an asset, or move one in from its menu.
        </p>
      )}
    </section>
  );
}

function GroupNameForm({
  initial = "",
  submitLabel,
  compact = false,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  submitLabel: string;
  compact?: boolean;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const clean = name.trim().replace(/\s+/g, " ");

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (clean === "" || busy) return;
        setBusy(true);
        await onSubmit(clean);
        setBusy(false);
      }}
      className={cn("flex flex-1 flex-wrap items-center gap-2", !compact && "rounded-xl border border-hairline p-3")}
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        maxLength={MAX_GROUP_NAME}
        autoFocus
        aria-label="Group name"
        placeholder="A person or product, e.g. Ada or Glow serum"
        className="h-9 min-w-0 flex-1 rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
      />
      <button
        type="submit"
        disabled={clean === "" || busy}
        className="inline-flex h-9 cursor-pointer items-center rounded-[10px] bg-ink px-3.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitLabel}
      </button>
      <button type="button" onClick={onCancel} className="inline-flex h-9 cursor-pointer items-center rounded-[10px] px-3 text-sm text-ink-soft hover:bg-cloud hover:text-ink">
        Cancel
      </button>
    </form>
  );
}

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  const meta = tab === "all" ? null : KIND_META[tab];
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-hairline px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">{meta ? `No ${meta.plural.toLowerCase()} yet` : "Your library is empty"}</p>
      <p className="max-w-sm text-sm text-ink-soft">
        {meta ? meta.hint : "Add faces, voices, products and places, and group them by person or product to pick them together."}
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
