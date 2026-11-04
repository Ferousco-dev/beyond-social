"use client";

import Link from "next/link";

import { ChoiceChips } from "@/components/ui/choice-chips";
import { useLibrary } from "@/features/asset-library/use-library";

import { ConversationTurns } from "./conversation-turns";
import { LibraryPicker } from "./library-picker";
import { MIN_TURNS, isTalking, newTurn, type GenerateFormValues } from "./types";

const SPEAKER_MODES = [
  { value: "single", label: "One person" },
  { value: "conversation", label: "Conversation" },
] as const;

/**
 * Step D: who and what appears, picked one by one from the saved library.
 * Nothing is uploaded here, so every video is made from labelled, consented
 * assets the person can reuse.
 */
export function StepAssets({
  values,
  onChange,
}: {
  values: GenerateFormValues;
  onChange: (patch: Partial<GenerateFormValues>) => void;
}) {
  const library = useLibrary();

  if (library.status === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <span className="sr-only">Loading your saved assets</span>
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map((tile) => (
              <div key={tile} className="aspect-square animate-pulse rounded-xl bg-cloud" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (library.status === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {library.message}
      </p>
    );
  }

  const assets = library.assets;
  const hasFace = assets.some((asset) => asset.kind === "face");

  // The clip starts from the face when there is one and it is not talking,
  // otherwise from the product, then the environment.
  function pick(patch: Partial<GenerateFormValues>): void {
    const next = { ...values, ...patch };
    const frame = [next.faceAssetId, next.productAssetId, next.environmentAssetId]
      .map((id) => assets.find((asset) => asset.id === id))
      .find((asset) => asset?.file_kind === "image");
    onChange({ ...patch, firstFrameId: frame?.media_id ?? "" });
  }

  return (
    <div className="flex flex-col gap-6">
      {!hasFace ? (
        <div className="rounded-xl border border-hairline bg-cloud/50 p-4">
          <p className="text-sm font-medium text-ink">Create an avatar first</p>
          <p className="mt-1 text-sm text-ink-soft">
            Videos with a person use one of your saved faces. Add a face (and a voice recording if they should speak) in
            Assets, label them clearly, then pick them here.
          </p>
          <Link
            href="/dashboard/assets"
            className="mt-3 inline-flex h-9 items-center rounded-[10px] bg-ink px-3.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Go to Assets
          </Link>
        </div>
      ) : null}

      <ChoiceChips
        label="Who speaks"
        options={SPEAKER_MODES}
        value={values.speakerMode}
        onChange={(mode) =>
          onChange(
            mode === "conversation"
              ? { speakerMode: "conversation", turns: values.turns.length >= MIN_TURNS ? values.turns : [newTurn(), newTurn()] }
              : { speakerMode: "single" },
          )
        }
      />

      {values.speakerMode === "conversation" ? (
        <ConversationTurns assets={assets} turns={values.turns} onChange={(turns) => onChange({ turns })} />
      ) : (
        <>
          <LibraryPicker
            kind="face"
            assets={assets}
            value={values.faceAssetId}
            onChange={(asset) => pick({ faceAssetId: asset?.id ?? "" })}
          />
          <LibraryPicker
            kind="voice"
            assets={assets}
            value={values.voiceAssetId}
            onChange={(asset) => pick({ voiceAssetId: asset?.id ?? "" })}
          />
          <p className="-mt-3 text-xs text-ink-soft">
            {isTalking(values)
              ? "The face will speak your saved voice recording, lip-synced to it."
              : values.voiceAssetId !== ""
                ? "Pick a face too, so someone speaks the recording."
                : "Pick a face and a voice for a talking video, or leave the voice out for a clip without speech from a person."}
          </p>
        </>
      )}

      <LibraryPicker
        kind="product"
        assets={assets}
        value={values.productAssetId}
        onChange={(asset) => pick({ productAssetId: asset?.id ?? "" })}
      />
      <LibraryPicker
        kind="environment"
        assets={assets}
        value={values.environmentAssetId}
        onChange={(asset) => pick({ environmentAssetId: asset?.id ?? "" })}
      />
    </div>
  );
}
