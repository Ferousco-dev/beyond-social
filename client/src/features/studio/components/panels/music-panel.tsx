"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Music2, X } from "lucide-react";

import { useLibrary } from "@/features/asset-library/use-library";
import { cn } from "@/lib/utils";

import { contentLength, currentMusic, DEFAULT_MUSIC_VOLUME, setBackgroundMusic } from "../../core/music.ts";
import { makeId } from "../../lib/format";
import { mediaRef } from "../../lib/media-ref";
import { SOUNDS, soundRef, soundUrl } from "../../lib/sounds";
import { selectProject, useStudio } from "../../store/editor-store";

interface Track {
  readonly src: string;
  readonly name: string;
  /** Known for built-in tracks; read from the file for the person's own. */
  readonly seconds?: number;
  readonly url?: string;
}

const BUILT_IN: readonly Track[] = SOUNDS.filter((sound) => sound.category === "Music").map((sound) => ({
  src: soundRef(sound.id),
  name: sound.name,
  seconds: sound.seconds,
}));

/** How long an audio file plays, read from its header without downloading it all. */
function lengthOf(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => (Number.isFinite(audio.duration) ? resolve(audio.duration) : reject(new Error("unknown length")));
    audio.onerror = () => reject(new Error("unreadable"));
    audio.src = url;
  });
}

/** Background music: pick a track, it fills the whole video under everything else. */
export function MusicPanel() {
  const project = useStudio(selectProject);
  const library = useLibrary();
  const [busy, setBusy] = useState<string | null>(null);
  const music = currentMusic(project);
  const length = contentLength(project);
  const own: Track[] =
    library.status === "ready"
      ? library.assets.filter((asset) => asset.kind === "music").map((asset) => ({ src: mediaRef(asset.media_id), name: asset.label, url: asset.url }))
      : [];
  const name = music ? ([...BUILT_IN, ...own].find((track) => track.src === music.src)?.name ?? "Background music") : null;

  // Built-in tracks are made in the browser; making them now means they play at once.
  useEffect(() => {
    for (const sound of SOUNDS.filter((s) => s.category === "Music")) {
      void soundUrl(sound.id)
        .then((url) => useStudio.getState().setMediaUrls({ [soundRef(sound.id)]: url }))
        .catch(() => undefined);
    }
  }, []);

  const apply = (next: { src: string; seconds: number; volume: number } | null): void => {
    const failure = useStudio.getState().edit((p) => setBackgroundMusic(p, next, makeId), "music");
    if (failure) useStudio.getState().setNotice(failure);
  };

  async function choose(track: Track): Promise<void> {
    if (length <= 0) return useStudio.getState().setNotice("Add a clip first, so the music has a video to sit under.");
    setBusy(track.src);
    try {
      const seconds = track.seconds ?? (track.url ? await lengthOf(track.url) : 0);
      if (seconds <= 0) return useStudio.getState().setNotice("That track could not be read.");
      apply({ src: track.src, seconds, volume: music?.volume ?? DEFAULT_MUSIC_VOLUME });
    } catch {
      useStudio.getState().setNotice("That track could not be read.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 p-3">
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
          <p className="text-xs text-ink-soft">The track repeats to cover the whole video. Fit it again after adding or removing clips.</p>
        </section>
      ) : (
        <p className="text-sm text-ink-soft">Pick a track to play quietly under the whole video.</p>
      )}

      <TrackList title="Your music" tracks={own} current={music?.src} busy={busy} onChoose={(track) => void choose(track)}>
        {library.status === "ready" && own.length === 0 ? (
          <p className="text-xs text-ink-soft">
            No music saved yet.{" "}
            <Link href="/dashboard/assets" className="font-medium text-primary underline underline-offset-2">
              Add a track in Assets
            </Link>{" "}
            that you have the rights to use.
          </p>
        ) : null}
      </TrackList>
      <TrackList title="Built in" tracks={BUILT_IN} current={music?.src} busy={busy} onChoose={(track) => void choose(track)} />
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
