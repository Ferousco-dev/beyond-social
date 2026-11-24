"use client";

import { cn } from "@/lib/utils";
import { useLibrary } from "@/features/asset-library/use-library";

import { unusedAssetNotes } from "./asset-use";
import { ConversationTurns } from "./conversation-turns";
import { LibraryPicker } from "./library-picker";
import type { GenerateFormValues } from "./types";

/**
 * Who and what appears, picked one by one from the saved library.
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

  // The clip starts from the face when there is one and it is not talking,
  // otherwise from the product, then the environment.
  function pick(patch: Partial<GenerateFormValues>): void {
    // A recording only means something with a face to speak it, so taking the face away takes it too.
    if (patch.faceAssetId === "") patch = { ...patch, voiceAssetId: "" };
    const next = { ...values, ...patch };
    const frame = [next.faceAssetId, next.productAssetId, next.environmentAssetId]
      .map((id) => assets.find((asset) => asset.id === id))
      .find((asset) => asset?.file_kind === "image");
    onChange({ ...patch, firstFrameId: frame?.media_id ?? "" });
  }

  const notes = unusedAssetNotes(values, assets);
  const groups = library.groups.filter((group) => assets.some((asset) => asset.group_id === group.id));

  // A group fills every slot it has an asset for: the first usable face, voice, product and place in it.
  function applyGroup(groupId: string): void {
    const first = (kind: string): string =>
      assets.find((asset) => asset.group_id === groupId && asset.kind === kind && (!(kind === "face" || kind === "voice") || asset.consent_at !== null))?.id ?? "";
    const face = first("face");
    pick({
      speakerMode: "single",
      faceAssetId: face,
      voiceAssetId: face ? first("voice") : "",
      productAssetId: first("product") || values.productAssetId,
      environmentAssetId: first("environment") || values.environmentAssetId,
    });
  }
  const inGroup = (groupId: string): boolean =>
    [values.faceAssetId, values.productAssetId].some((id) => id !== "" && assets.find((asset) => asset.id === id)?.group_id === groupId);

  return (
    <div className="flex flex-col gap-6">
      {groups.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">Use a group</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Use a group">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={inGroup(group.id)}
                onClick={() => applyGroup(group.id)}
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  inGroup(group.id) ? "border-ink bg-ink text-paper" : "border-hairline text-ink hover:bg-cloud",
                )}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {/* One person or a conversation is decided by our AI when it fills in the video, so nobody is asked. */}
      {values.speakerMode === "conversation" ? (
        <ConversationTurns assets={assets} turns={values.turns} onChange={(turns) => onChange({ turns })} />
      ) : (
        <>
          <LibraryPicker
            kind="face"
            title="Person"
            assets={assets}
            value={values.faceAssetId}
            onChange={(asset) => pick({ faceAssetId: asset?.id ?? "" })}
          />
          {values.faceAssetId !== "" || values.voiceAssetId !== "" ? (
            <>
              <LibraryPicker
                kind="voice"
                title="Their own voice"
                assets={assets}
                value={values.voiceAssetId}
                onChange={(asset) => pick({ voiceAssetId: asset?.id ?? "" })}
              />
            </>
          ) : null}
        </>
      )}

      <details open={values.productAssetId !== "" || values.environmentAssetId !== ""} className="rounded-xl border border-hairline px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Show a product or a place <span className="font-normal text-ink-soft">(optional)</span>
        </summary>
        <div className="mt-3 flex flex-col gap-5">
          <LibraryPicker
            kind="product"
            title="Product"
            assets={assets}
            value={values.productAssetId}
            onChange={(asset) => pick({ productAssetId: asset?.id ?? "" })}
          />
          <LibraryPicker
            kind="environment"
            title="Place"
            assets={assets}
            value={values.environmentAssetId}
            onChange={(asset) => pick({ environmentAssetId: asset?.id ?? "" })}
          />
        </div>
      </details>

      {notes.length > 0 ? (
        <div role="status" className="flex flex-col gap-1 rounded-xl border border-hairline bg-cloud/50 p-3 text-sm text-ink-soft">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
