"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Select } from "@/components/ui/select";
import type { LibraryAsset } from "@/features/asset-library/types";

import { MAX_TURNS, MIN_TURNS, newTurn, type ConversationTurn } from "./types";

const iconButton =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30";

/**
 * The people in a conversation, one turn each, in the order they speak.
 * Every turn is lip-synced to its own saved recording, then the turns play
 * back to back in the editor.
 */
export function ConversationTurns({
  assets,
  turns,
  onChange,
}: {
  assets: readonly LibraryAsset[];
  turns: readonly ConversationTurn[];
  onChange: (turns: ConversationTurn[]) => void;
}) {
  const usable = (kind: "face" | "voice") =>
    assets
      .filter((asset) => asset.kind === kind && asset.consent_at !== null && asset.file_kind === (kind === "face" ? "image" : "audio"))
      .map((asset) => ({ value: asset.id, label: asset.label }));
  const faces = usable("face");
  const voices = usable("voice");

  const update = (index: number, patch: Partial<ConversationTurn>): void =>
    onChange(turns.map((turn, i) => (i === index ? { ...turn, ...patch } : turn)));
  const move = (index: number, by: -1 | 1): void => {
    const next = [...turns];
    const [turn] = next.splice(index, 1);
    if (turn) next.splice(index + by, 0, turn);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {faces.length < 2 || voices.length < 2 ? (
        <p className="rounded-xl border border-hairline bg-cloud/50 px-3 py-2 text-xs leading-relaxed text-ink-soft">
          A conversation needs a consented face and voice recording for each person. You have {faces.length} face
          {faces.length === 1 ? "" : "s"} and {voices.length} voice{voices.length === 1 ? "" : "s"} ready; add more in Assets.
          The same person can also speak more than one turn.
        </p>
      ) : null}
      <ol className="flex flex-col gap-3">
        {turns.map((turn, index) => (
          <li key={turn.id} className="rounded-xl border border-hairline bg-paper p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">Turn {index + 1}</span>
              <span className="flex items-center gap-0.5">
                <button type="button" aria-label={`Move turn ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)} className={iconButton}>
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button type="button" aria-label={`Move turn ${index + 1} down`} disabled={index === turns.length - 1} onClick={() => move(index, 1)} className={iconButton}>
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Remove turn ${index + 1}`}
                  disabled={turns.length <= MIN_TURNS}
                  onClick={() => onChange(turns.filter((_, i) => i !== index))}
                  className={iconButton}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Select aria-label={`Turn ${index + 1} face`} value={turn.faceAssetId} placeholder="Choose a face" options={faces} onValueChange={(faceAssetId) => update(index, { faceAssetId })} />
              <Select aria-label={`Turn ${index + 1} voice`} value={turn.voiceAssetId} placeholder="Choose a voice recording" options={voices} onValueChange={(voiceAssetId) => update(index, { voiceAssetId })} />
            </div>
            <label className="mt-2 flex flex-col gap-1 text-xs text-ink-soft">
              What the recording says
              <textarea
                value={turn.words}
                onChange={(event) => update(index, { words: event.target.value })}
                rows={2}
                maxLength={5000}
                placeholder="The words in this voice recording"
                className="w-full rounded-[10px] border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              />
            </label>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={turns.length >= MAX_TURNS}
        onClick={() => onChange([...turns, newTurn()])}
        className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 self-start rounded-[10px] border border-hairline px-3.5 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
        Add a turn
      </button>
      <p className="text-xs text-ink-soft">
        {turns.length} of {MAX_TURNS} turns. Each turn is its own lip-synced clip and is charged like one talking video.
      </p>
    </div>
  );
}
