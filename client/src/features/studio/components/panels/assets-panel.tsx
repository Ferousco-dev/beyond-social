"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

import { type Asset } from "../../core/types.ts";
import { useUpload } from "../../hooks/use-upload";
import { placeAsset } from "../../lib/place-asset";
import { selectProject, useStudio } from "../../store/editor-store";
import { AssetRow } from "./asset-row";
import { SoundLibrary } from "./sound-library";

const COPY = {
  video: { accept: "video/mp4,video/quicktime,video/webm", empty: "Upload a video to cut and edit.", noun: "video" },
  audio: { accept: "audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg", empty: "Upload a song or a sound to place on the timeline.", noun: "sound" },
  image: { accept: "image/jpeg,image/png,image/webp", empty: "Upload a picture to place over the video.", noun: "picture" },
} as const;

/** The files of one kind in this project, with an upload button and a way to put each on the timeline. */
export function AssetsPanel({ kind }: { kind: Asset["kind"] }) {
  const project = useStudio(selectProject);
  const { upload, busy } = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const copy = COPY[kind];
  const assets = (project.assets ?? []).filter((a) => a.kind === kind);

  const choose = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const asset = await upload(file, kind);
    if (asset) placeAsset(asset);
  };

  return (
    <div className="space-y-3 p-3">
      <input ref={input} type="file" accept={copy.accept} hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
      <Button variant="outline" size="sm" className="w-full" disabled={busy} onClick={() => input.current?.click()}>
        <Upload aria-hidden />
        {busy ? "Uploading" : `Upload ${copy.noun}`}
      </Button>
      {kind === "video" ? <p className="text-xs text-ink-soft">Uploaded videos go straight to the timeline. They are not sent to the AI unless you ask it to watch one.</p> : null}
      {assets.length === 0 ? (
        <p className="text-xs text-ink-soft">{copy.empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {assets.map((asset) => (
            <AssetRow key={asset.src} asset={asset} />
          ))}
        </ul>
      )}
      {kind === "audio" ? <SoundLibrary /> : null}
    </div>
  );
}
