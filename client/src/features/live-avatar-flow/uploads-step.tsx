"use client";

import { useEffect, useState } from "react";

import {
  cloneVoiceSample,
  consentAssetGroup,
  getAssetGroup,
  updateAssetGroup,
  type GroupDetailResult,
} from "@/features/asset-groups/actions";
import { uploadGroupFile } from "@/features/asset-groups/upload";
import { listVoices } from "@/features/live-avatar/avatar-video-actions";
import type { AssetGroup, AssetGroupDetail, GoVoice } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

const SLOTS = [
  { id: "face", label: "Face image or video", accept: "image/*,video/*", hint: "The person who appears." },
  { id: "voice", label: "Voice sample", accept: "audio/*", hint: "A clear recording, 30 seconds or more." },
  { id: "product", label: "Product", accept: "image/*,video/*", hint: "Several angles work best." },
  { id: "environment", label: "Environment (recommended)", accept: "image/*,video/*", hint: "Where the video happens." },
] as const;

type SlotId = (typeof SLOTS)[number]["id"];

/** Steps 2–5: fill the four slots by upload, consent, clone the voice. */
export function UploadsStep({
  group,
  voiceId,
  onChange,
  onVoiceReady,
}: {
  group: AssetGroup;
  voiceId: string;
  onChange: (group: AssetGroupDetail) => void;
  onVoiceReady: (voiceId: string) => void;
}) {
  const [detail, setDetail] = useState<AssetGroupDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState(group.name);
  const [voices, setVoices] = useState<readonly GoVoice[]>([]);

  useEffect(() => {
    void listVoices().then((result) => {
      if (result.status === "ok") setVoices(result.voices.filter((voice) => voice.scope === "own"));
    });
  }, []);

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
        slots: { face: current.face, voice: current.voice, product: current.product, environment: current.environment, [slot]: uploaded.mediaId },
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

  async function clone(): Promise<void> {
    const voiceSlot = detail?.slots.voice ?? group.slots.voice;
    if (voiceSlot === "" || voiceName.trim() === "") {
      setError("Upload a voice sample and name it first.");
      return;
    }
    setBusy("clone");
    setError(null);
    try {
      const result = await cloneVoiceSample({ name: voiceName.trim(), mediaId: voiceSlot, groupId: group.id });
      if (result.status !== "ok") {
        setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
        return;
      }
      onVoiceReady(result.voiceId);
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
      <p className="text-sm text-ink-soft">
        Filling <span className="font-medium text-ink">{group.name}</span>. Uploads only, nothing is
        recorded here. Everything saves into the group as you go.
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
                  I confirm this {slot.id} is mine to clone
                </button>
              )
            ) : null}
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-hairline bg-paper p-4">
        <p className="text-sm font-semibold text-ink">Clone the voice</p>
        <p className="mt-0.5 text-xs text-ink-soft">Needs the sample above plus recorded consent.</p>
        <span className="mt-3 flex gap-2">
          <input
            value={voiceName}
            onChange={(event) => setVoiceName(event.target.value)}
            placeholder="Voice name"
            aria-label="Voice name"
            className="h-10 min-w-0 flex-1 rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void clone()}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Clone
          </button>
        </span>
        {voices.length > 0 ? (
          <label className="mt-3 flex flex-col gap-1.5 text-xs font-medium text-ink">
            Use a saved cloned voice
            <select
              value={voiceId}
              onChange={(event) => { if (event.target.value !== "") onVoiceReady(event.target.value); }}
              className="h-10 rounded-[10px] border border-hairline bg-paper px-3 text-sm font-normal text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary"
            >
              <option value="">Choose a saved voice</option>
              {voices.map((voice) => <option key={voice.voice_id} value={voice.voice_id}>{voice.name}</option>)}
            </select>
          </label>
        ) : null}
      </div>

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
    </div>
  );
}
