"use client";

import Link from "next/link";

import { Select } from "@/components/ui/select";
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
          <div key={row} className="h-10 animate-pulse rounded-[10px] bg-cloud" />
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

  // A group fills the person, product and place. Their recording is left for them to choose,
  // because it would speak its own words instead of the script.
  function applyGroup(groupId: string): void {
    const first = (kind: string): string =>
      assets.find((asset) => asset.group_id === groupId && asset.kind === kind && (!(kind === "face" || kind === "voice") || asset.consent_at !== null))?.id ?? "";
    const face = first("face");
    pick({
      speakerMode: "single",
      faceAssetId: face,
      voiceAssetId: "",
      productAssetId: first("product") || values.productAssetId,
      environmentAssetId: first("environment") || values.environmentAssetId,
    });
  }
  const inGroup = (groupId: string): boolean =>
    [values.faceAssetId, values.productAssetId].some((id) => id !== "" && assets.find((asset) => asset.id === id)?.group_id === groupId);

  const has = (kind: string): boolean => assets.some((asset) => asset.kind === kind);
  const missing = [
    has("face") ? "" : "people",
    has("product") ? "" : "products",
    has("environment") ? "" : "places",
  ].filter(Boolean);
  const currentGroup = groups.find((group) => inGroup(group.id))?.id ?? "";

  return (
    <div className="flex flex-col gap-3">
      {/* One person or a conversation is decided by our AI when it fills in the video, so nobody is asked. */}
      {values.speakerMode === "conversation" ? (
        <ConversationTurns assets={assets} turns={values.turns} onChange={(turns) => onChange({ turns })} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs text-ink-soft">Group</span>
            <Select
              aria-label="Use a group"
              value={currentGroup}
              placeholder="Pick a group"
              options={groups.map((group) => ({ value: group.id, label: group.name }))}
              onValueChange={(groupId) => applyGroup(groupId)}
              className="h-10"
            />
          </div>
        ) : null}
        {values.speakerMode === "conversation" ? null : (
          <LibraryPicker kind="face" title="Person" assets={assets} value={values.faceAssetId} onChange={(asset) => pick({ faceAssetId: asset?.id ?? "" })} />
        )}
        {values.speakerMode !== "conversation" && values.faceAssetId !== "" ? (
          <LibraryPicker
            kind="voice"
            title="Their own recording"
            assets={assets}
            value={values.voiceAssetId}
            onChange={(asset) => pick({ voiceAssetId: asset?.id ?? "" })}
          />
        ) : null}
        <LibraryPicker kind="product" title="Product" assets={assets} value={values.productAssetId} onChange={(asset) => pick({ productAssetId: asset?.id ?? "" })} />
        <LibraryPicker kind="environment" title="Place" assets={assets} value={values.environmentAssetId} onChange={(asset) => pick({ environmentAssetId: asset?.id ?? "" })} />
      </div>
      {missing.length > 0 ? (
        <p className="text-xs text-ink-soft">
          No saved {missing.join(" or ")} yet.{" "}
          <Link href="/dashboard/assets" className="text-primary underline-offset-2 hover:underline">
            Add them in Assets
          </Link>
        </p>
      ) : null}

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
