"use client";

import { useState } from "react";

import type { AssetGroupDetail } from "@/lib/go-api/schemas";

import { Preview } from "./slot-card";

/** User-added extras beyond the four fixed slots. */
export function ExtrasSection({
  group,
  busy,
  onAdd,
  onRemove,
}: {
  group: AssetGroupDetail;
  busy: boolean;
  onAdd: (label: string, file: File) => void;
  onRemove: (mediaId: string) => void;
}) {
  const [label, setLabel] = useState("");

  return (
    <section aria-label="Extras">
      <h2 className="text-sm font-semibold text-ink">Extras</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {group.extra_views.map((extra) => (
          <li key={extra.media_id} className="flex items-center gap-3 rounded-xl border border-hairline bg-paper px-3 py-2">
            <span className="h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-cloud">
              <Preview view={extra} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{extra.name}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(extra.media_id)}
              className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-xs text-destructive hover:bg-cloud disabled:opacity-40"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <span className="mt-2 flex gap-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label, then choose a file"
          aria-label="Extra label"
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        />
        <label className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-[10px] border border-hairline px-3 text-sm text-ink transition-colors hover:bg-cloud">
          Add file
          <input
            type="file"
            className="hidden"
            disabled={busy || label.trim() === ""}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              onAdd(label.trim(), file);
              setLabel("");
            }}
          />
        </label>
      </span>
    </section>
  );
}
