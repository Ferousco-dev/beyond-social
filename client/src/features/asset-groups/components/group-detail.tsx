"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AssetGroupDetail } from "@/lib/go-api/schemas";

import {
  consentAssetGroup,
  deleteAssetGroup,
  getAssetGroup,
  updateAssetGroup,
} from "../actions";
import { uploadGroupFile } from "../upload";
import { ExtrasSection } from "./extras-section";
import { SLOTS, SlotCard, type SlotId } from "./slot-card";

type Outcome =
  | { readonly status: "ok" }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

/** One group: fill slots by upload, consent face and voice, extras, rename. */
export function GroupDetailView({ initial }: { initial: AssetGroupDetail }) {
  const router = useRouter();
  const [group, setGroup] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initial.name);

  async function run(task: () => Promise<Outcome>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await task();
      if (result.status !== "ok") {
        setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
        return;
      }
      const refreshed = await getAssetGroup(group.id);
      if (refreshed.status === "ok") setGroup(refreshed.group);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function fillSlot(slot: SlotId, file: File): Promise<void> {
    await run(async () => {
      const uploaded = await uploadGroupFile(file);
      if (uploaded.status !== "ok") return uploaded;
      return updateAssetGroup(group.id, { slots: { ...group.slots, [slot]: uploaded.mediaId } });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Group name"
          className="h-11 min-w-0 flex-1 rounded-[10px] border border-hairline bg-paper px-3 text-lg font-semibold text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        />
        <button
          type="button"
          disabled={busy || name.trim() === "" || name === group.name}
          onClick={() => void run(async () => updateAssetGroup(group.id, { name: name.trim() }))}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-40"
        >
          Rename
        </button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            group={group}
            busy={busy}
            onUpload={(id, file) => void fillSlot(id, file)}
            onConsent={(id) => void run(async () => consentAssetGroup(group.id, id as "face" | "voice"))}
          />
        ))}
      </ul>

      <ExtrasSection
        group={group}
        busy={busy}
        onAdd={(label, file) =>
          void run(async () => {
            const uploaded = await uploadGroupFile(file);
            if (uploaded.status !== "ok") return uploaded;
            return updateAssetGroup(group.id, {
              extras: [...group.extras, { id: uploaded.mediaId, label }],
            });
          })
        }
        onRemove={(mediaId) =>
          void run(async () =>
            updateAssetGroup(group.id, {
              extras: group.extras.filter((item) => item.id !== mediaId),
            }),
          )
        }
      />

      {busy ? (
        <p className="text-sm text-ink-soft" aria-live="polite">
          Working…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Delete "${group.name}"? The files stay in your storage.`)) return;
            void run(async () => {
              const result = await deleteAssetGroup(group.id);
              if (result.status === "ok") router.push("/dashboard/assets");
              return result;
            });
          }}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-destructive transition-colors hover:bg-cloud disabled:opacity-40"
        >
          Delete group
        </button>
      </div>
    </div>
  );
}
