"use client";

import { useCallback, useEffect, useState } from "react";

import type { AssetGroup } from "@/lib/go-api/schemas";

import { createAssetGroup, listAssetGroups } from "@/features/asset-groups/actions";

/** Step 1: pick a group or start avatar001-and-on. */
export function GroupStep({
  selected,
  onSelect,
}: {
  selected: AssetGroup | null;
  onSelect: (group: AssetGroup) => void;
}) {
  const [groups, setGroups] = useState<readonly AssetGroup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const result = await listAssetGroups();
    if (result.status === "ok") {
      setGroups(result.groups);
    } else {
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await createAssetGroup("");
    setBusy(false);
    if (result.status !== "ok") {
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
      return;
    }
    await load();
    onSelect(result.group);
  }

  useEffect(() => {
    void load();
  }, [load]);

  if (groups === null) {
    return <p className="text-sm text-ink-soft">Loading groups…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.length === 0 ? (
        <p className="text-sm text-ink-soft">No groups yet. Create the first one.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => onSelect(group)}
                aria-pressed={selected?.id === group.id}
                className={`block w-full cursor-pointer rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selected?.id === group.id ? "border-primary bg-paper" : "border-hairline bg-paper hover:bg-cloud/60"
                }`}
              >
                <span className="text-sm font-semibold text-ink">{group.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Creating…" : "New group"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
