"use client";

import { useState } from "react";

import {
  consentAssetGroup,
  getAssetGroup,
  updateAssetGroup,
  type GroupDetailResult,
} from "@/features/asset-groups/actions";
import { uploadGroupFile } from "@/features/asset-groups/upload";
import type { AssetGroup, AssetGroupDetail } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

const SLOTS = [
  {
    id: "face",
    label: "Face portrait",
    accept: "image/*",
    hint: "The photo of the person who appears.",
  },
  {
    id: "voice",
    label: "Spoken voice audio",
    accept: "audio/*",
    hint: "This voice is not cloned: say your script in your audio recording so the Kling lip-sync model can animate your avatar to match.",
  },
  {
    id: "product",
    label: "Product",
    accept: "image/*,video/*",
    hint: "Several angles work best.",
  },
  {
    id: "environment",
    label: "Environment (recommended)",
    accept: "image/*,video/*",
    hint: "Where the video happens.",
  },
] as const;

type SlotId = (typeof SLOTS)[number]["id"];

/** Fill slots by upload, record consent, and prepare direct voice audio. */
export function UploadsStep({
  group,
  onChange,
}: {
  group: AssetGroup;
  onChange: (group: AssetGroupDetail) => void;
}) {
  const [detail, setDetail] = useState<AssetGroupDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    const result: GroupDetailResult = await getAssetGroup(group.id);
    if (result.status === "ok") {
      setDetail(result.group);
      onChange(result.group);
    }
  }

  async function upload(slot: SlotId, file: File): Promise<void> {
    setBusy(`upload-${slot}`);
    setError(null);
    try {
      const uploaded = await uploadGroupFile(file);
      if (uploaded.status !== "ok") {
        setError(uploaded.message);
        return;
      }
      const current = detail?.slots ?? group.slots;
      const updated = await updateAssetGroup(group.id, {
        slots: {
          face: current.face,
          voice: current.voice,
          product: current.product,
          environment: current.environment,
          [slot]: uploaded.mediaId,
        },
      });
      if (updated.status !== "ok") {
        setError(updated.status === "unconfigured" ? "The backend is not connected yet." : updated.message);
        return;
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function consent(kind: "face" | "voice"): Promise<void> {
    setBusy(`consent-${kind}`);
    setError(null);
    try {
      const result = await consentAssetGroup(group.id, kind);
      if (result.status !== "ok") {
        setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
        return;
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const filled = (id: SlotId): string => detail?.slots[id] ?? group.slots[id] ?? "";
  const consented = (kind: "face" | "voice"): boolean =>
    kind === "face" ? detail?.face_consent_at != null : detail?.voice_consent_at != null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-hairline bg-paper p-4">
        <p className="text-sm font-medium text-ink">
          Voice lip-sync rule
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          This voice is not cloned. Say your script in your uploaded audio recording, and the Kling lip-sync model will animate your avatar to match your words.
        </p>
      </div>

      <p className="text-sm text-ink-soft">
        Filling <span className="font-medium text-ink">{group.name}</span>. Uploads only, nothing is recorded here. Everything saves into the group as you go.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((slot) => (
          <li key={slot.id} className="rounded-2xl border border-hairline bg-paper p-4">
            <p className="text-sm font-semibold text-ink">{slot.label}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{slot.hint}</p>
            <p className={cn("mt-1 text-xs", filled(slot.id) !== "" ? "text-success" : "text-ink-soft")}>
              {filled(slot.id) !== "" ? "Attached" : "Empty"}
            </p>
            <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border border-hairline px-3 text-sm text-ink transition-colors hover:bg-cloud">
              {filled(slot.id) !== "" ? "Replace" : "Upload"}
              <input
                type="file"
                accept={slot.accept}
                className="hidden"
                disabled={busy !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void upload(slot.id, file);
                }}
              />
            </label>
            {(slot.id === "face" || slot.id === "voice") && filled(slot.id) !== "" ? (
              consented(slot.id) ? (
                <p className="mt-2 text-xs font-medium text-success">Consent recorded</p>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void consent(slot.id)}
                  className="mt-2 inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-40"
                >
                  I confirm this {slot.id} is mine to use
                </button>
              )
            ) : null}
          </li>
        ))}
      </ul>

      {busy ? (
        <p className="text-sm text-ink-soft" aria-live="polite">
          Working...
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
