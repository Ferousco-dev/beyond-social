"use client";

import { useRef, useState } from "react";
import { Music2, Upload, X } from "lucide-react";

import { uploadGroupFile } from "@/features/asset-groups/upload";
import { createLibraryAsset } from "@/features/asset-library/actions";
import { KIND_META } from "@/features/asset-library/types";
import { invalidateLibrary, useLibrary } from "@/features/asset-library/use-library";
import { standardType } from "@/lib/file-type";
import { cn } from "@/lib/utils";

import { contentLength, currentMusic, DEFAULT_MUSIC_VOLUME, setBackgroundMusic } from "../../core/music.ts";
import { makeId } from "../../lib/format";
import { mediaRef } from "../../lib/media-ref";
import { selectProject, useStudio } from "../../store/editor-store";

interface Track {
  readonly mediaId: string;
  readonly src: string;
  readonly name: string;
  readonly url?: string;
}

/** Picks a non-colliding label within the server's 60-character limit. */
function uniqueLabel(filename: string, existing: readonly Track[]): string {
  const raw = filename.replace(/\.[^.]+$/, "").replace(/\s+/g, " ").trim().slice(0, 60) || "Music";
  const taken = new Set(existing.map((track) => track.name.toLowerCase()));
  if (!taken.has(raw.toLowerCase())) return raw;
  for (let n = 2; n < 1000; n += 1) {
    const suffix = ` (${n})`;
    const candidate = `${raw.slice(0, 60 - suffix.length).trimEnd()}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return raw;
}

/** How long an audio file plays, read from its header without downloading it all. */
function lengthOf(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => (Number.isFinite(audio.duration) ? resolve(audio.duration) : reject(new Error("unknown length")));
    audio.onerror = () => reject(new Error("unreadable"));
    // A stalled link must not leave the panel waiting for ever.
    window.setTimeout(() => reject(new Error("timed out")), 10_000);
    audio.src = url;
  });
}

/** Background music: pick a track, it fills the whole video under everything else. */
export function MusicPanel() {
  const project = useStudio(selectProject);
  const library = useLibrary();
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const music = currentMusic(project);
  const length = contentLength(project);
  const own: Track[] =
    library.status === "ready"
      ? library.assets
          .filter((asset) => asset.kind === "music")
          .map((asset) => ({ mediaId: asset.media_id, src: mediaRef(asset.media_id), name: asset.label, url: asset.url }))
      : [];
  const name = music ? (own.find((track) => track.src === music.src)?.name ?? "Background music") : null;

  const apply = (next: { src: string; seconds: number; volume: number } | null): void => {
    const failure = useStudio.getState().edit((p) => setBackgroundMusic(p, next, makeId), "music");
    if (failure) useStudio.getState().setNotice(failure);
  };

  async function choose(track: Track): Promise<void> {
    if (length <= 0) return useStudio.getState().setNotice("Add a clip first, so the music has a video to sit under.");
    setBusy(track.src);
    try {
      if (track.url) useStudio.getState().setMediaUrls({ [track.mediaId]: track.url });
      const seconds = track.url ? await lengthOf(track.url) : 0;
      if (seconds <= 0) return useStudio.getState().setNotice("That track could not be read.");
      apply({ src: track.src, seconds, volume: music?.volume ?? DEFAULT_MUSIC_VOLUME });
    } catch {
      useStudio.getState().setNotice("That track could not be read.");
    } finally {
      setBusy(null);
    }
  }

  /** Saves a track to the library, so it is there next time, and puts it under this video when clips exist. */
  async function upload(file: File | undefined): Promise<void> {
    if (!file) return;
    const type = standardType(file.type, file.name);
    if (!type.startsWith("audio/")) return useStudio.getState().setNotice("Pick an audio file.");
    setUploading(true);
    try {
      const url = URL.createObjectURL(file);
      const seconds = await lengthOf(url).catch(() => 0);
      URL.revokeObjectURL(url);
      if (seconds <= 0) return useStudio.getState().setNotice("That file could not be read as audio.");
      const stored = await uploadGroupFile(file);
      if (stored.status !== "ok") return useStudio.getState().setNotice(stored.message);
      const created = await createLibraryAsset({ kind: "music", label: uniqueLabel(file.name, own), mediaId: stored.mediaId });
      if (created.status !== "ok") {
        return useStudio.getState().setNotice(
          created.status === "unconfigured" ? "The service is not available right now. Try again in a few minutes." : created.message,
        );
      }
      invalidateLibrary();
      if (created.asset.url) useStudio.getState().setMediaUrls({ [stored.mediaId]: created.asset.url });
      const current = useStudio.getState().history.present;
      if (contentLength(current) > 0) {
        apply({ src: mediaRef(stored.mediaId), seconds, volume: currentMusic(current)?.volume ?? DEFAULT_MUSIC_VOLUME });
      } else {
        useStudio.getState().setNotice("Saved to your music. Add a clip first to play it under your video.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5 p-3">
      <input
        ref={picker}
        type="file"
        accept={KIND_META.music.accept}
        hidden
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => picker.current?.click()}
        className="btn btn-secondary btn-md w-full"
      >
        <Upload className="size-4" aria-hidden />
        {uploading ? "Uploading…" : "Upload music"}
      </button>
      <p className="-mt-3 text-xs text-ink-soft">MP3, M4A, WAV, or OGG (up to 25 MB).</p>

      {music ? (
        <section aria-label="Background music" className="space-y-3 rounded-lg border border-hairline p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
              <Music2 className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{name}</span>
            </p>
            <button type="button" aria-label="Remove the music" onClick={() => apply(null)} className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-cloud hover:text-ink">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <label className="flex items-center gap-3 text-xs text-ink-soft">
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={music.volume}
              onChange={(event) => apply({ ...music, volume: Number(event.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="w-9 text-right tabular-nums">{Math.round(music.volume * 100)}%</span>
          </label>
          <button type="button" onClick={() => apply(music)} className="text-xs font-medium text-primary hover:underline">
            Fit to the video again
          </button>
        </section>
      ) : null}

      <TrackList title="Your music" tracks={own} current={music?.src} busy={busy} onChoose={(track) => void choose(track)}>
        {library.status === "loading" ? <p className="text-xs text-ink-soft">Loading your music…</p> : null}
        {library.status === "error" ? (
          <p role="alert" className="text-xs text-destructive">
            {library.message}
          </p>
        ) : null}
        {library.status === "ready" && own.length === 0 ? (
          <p className="text-xs text-ink-soft">No saved tracks yet.</p>
        ) : null}
      </TrackList>
    </div>
  );
}

function TrackList({
  title,
  tracks,
  current,
  busy,
  onChoose,
  children,
}: {
  title: string;
  tracks: readonly Track[];
  current: string | undefined;
  busy: string | null;
  onChoose: (track: Track) => void;
  children?: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="space-y-1.5">
      <h3 className="text-xs text-ink-soft">{title}</h3>
      {children}
      <ul className="space-y-1">
        {tracks.map((track) => (
          <li key={track.src}>
            <button
              type="button"
              onClick={() => onChoose(track)}
              disabled={busy !== null}
              aria-pressed={current === track.src}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait",
                current === track.src ? "border-primary text-ink" : "border-hairline text-ink hover:bg-cloud",
              )}
            >
              <span className="truncate">{track.name}</span>
              <span className="shrink-0 text-xs text-ink-soft">{busy === track.src ? "Adding…" : current === track.src ? "Playing under video" : "Use"}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
