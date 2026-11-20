"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { transcribeVideo } from "../../assist-actions";
import { captionsFromWords, DEFAULT_CAPTION_STYLE } from "../../core/captions.ts";
import { endOf, locate } from "../../core/find.ts";
import { MUSIC_TRACK_ID } from "../../core/music.ts";
import { replaceCaptions, restyleCaptions } from "../../core/ops.ts";
import { CAPTION_PRESETS, type CaptionPreset, type Item, type Project } from "../../core/types.ts";
import { makeId } from "../../lib/format";
import { mediaId, resolveSrc } from "../../lib/media-ref";
import { resolveMediaUrls } from "../../media-actions";
import { selectProject, useStudio } from "../../store/editor-store";
import { Field } from "./field";

const PRESET_LABEL: Record<CaptionPreset, string> = { karaoke: "Karaoke", pill: "Pill", classic: "Classic", box: "Box", minimal: "Minimal" };
const SIZES = [{ label: "Small", value: 48 }, { label: "Medium", value: 64 }, { label: "Large", value: 84 }] as const;
const POSITIONS = [{ label: "Top", value: 0.15 }, { label: "Middle", value: 0.5 }, { label: "Bottom", value: 0.8 }] as const;

type MediaClip = Extract<Item, { kind: "video" | "audio" }>;

function targetClip(project: Project, selection: string | null): MediaClip | null {
  const chosen = selection ? locate(project, selection)?.item : undefined;
  if (chosen?.kind === "video" || chosen?.kind === "audio") return chosen;
  const firstVideo = project.tracks.find((t) => t.kind === "video")?.items[0];
  if (firstVideo?.kind === "video") return firstVideo;
  const firstAudio = project.tracks.find((t) => t.kind === "audio" && t.id !== MUSIC_TRACK_ID)?.items[0];
  return firstAudio?.kind === "audio" ? firstAudio : null;
}

function currentStyle(project: Project) {
  const first = project.tracks.flatMap((t) => t.items).find((i) => i.kind === "caption");
  return first?.kind === "caption" ? first.style : DEFAULT_CAPTION_STYLE;
}

function restyle(patch: Record<string, unknown>): void {
  useStudio.getState().edit((p) => restyleCaptions(p, patch), `captions:${Object.keys(patch).join(",")}`);
}

const CHOICE = "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary";

export function CaptionsPanel() {
  const project = useStudio(selectProject);
  const selection = useStudio((s) => s.selection);
  const [busy, setBusy] = useState(false);
  const clip = targetClip(project, selection);
  const style = currentStyle(project);

  const generate = async (): Promise<void> => {
    if (!clip) return;
    setBusy(true);
    try {
      // Clips refer to uploads as "media:<id>"; the server needs the file's own https address.
      let url = resolveSrc(clip.src, useStudio.getState().mediaUrls);
      if (!url.startsWith("https://")) {
        const id = mediaId(clip.src);
        if (id) {
          const links = await resolveMediaUrls([id]);
          url = links[id]?.url ?? "";
        }
      }
      if (!url.startsWith("https://")) {
        useStudio.getState().setNotice("That clip is still loading. Try again in a moment.");
        return;
      }
      const result = await transcribeVideo(url);
      if (!result.ok) {
        useStudio.getState().setNotice(result.message, result.code);
        return;
      }
      // Transcribing takes a while and the person may have moved, trimmed or removed the clip meanwhile.
      const latest = locate(useStudio.getState().history.present, clip.id)?.item;
      if (!latest || (latest.kind !== "video" && latest.kind !== "audio")) {
        useStudio.getState().setNotice("That clip was removed while listening. Try again.");
        return;
      }
      const captions = captionsFromWords(result.words, latest, makeId, style);
      if (captions.length === 0) {
        useStudio.getState().setNotice("No speech was found in that clip.");
        return;
      }
      useStudio.getState().edit((p) => replaceCaptions(p, latest.start, endOf(latest), captions));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 p-3">
      <div className="space-y-2">
        <button
          type="button"
          disabled={!clip || busy}
          onClick={() => void generate()}
          className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {busy ? "Listening" : "Generate captions"}
        </button>
        {!clip ? <p className="text-xs text-ink-soft">Add a video or audio clip first.</p> : null}
      </div>

      <Field label="Style">
        <div className="grid grid-cols-2 gap-2">
          {CAPTION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={(style.preset ?? "classic") === preset}
              onClick={() => restyle({ preset })}
              className={cn("flex h-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border bg-canvas text-xs text-ink-soft focus-visible:outline-2 focus-visible:outline-primary", (style.preset ?? "classic") === preset ? "border-primary" : "border-hairline hover:border-ink-soft")}
            >
              <span className="text-sm font-extrabold text-ink">
                Watch <span style={preset === "karaoke" || preset === "pill" ? { color: style.highlight ?? "#ffd400" } : undefined}>this</span> part
              </span>
              {PRESET_LABEL[preset]}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Text" value={style.color}>
          <input type="color" aria-label="Caption text colour" value={style.color} onChange={(e) => restyle({ color: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-hairline bg-canvas p-1" />
        </Field>
        <Field label="Highlight" value={style.highlight ?? "#ffd400"}>
          <input type="color" aria-label="Caption highlight colour" value={style.highlight ?? "#ffd400"} onChange={(e) => restyle({ highlight: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-hairline bg-canvas p-1" />
        </Field>
      </div>

      <Field label="Size">
        <div className="flex gap-2">
          {SIZES.map(({ label, value }) => (
            <button key={label} type="button" aria-pressed={style.size === value} onClick={() => restyle({ size: value })} className={cn(CHOICE, "flex-1", style.size === value ? "border-primary text-ink" : "border-hairline text-ink-soft hover:text-ink")}>
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Position">
        <div className="flex gap-2">
          {POSITIONS.map(({ label, value }) => (
            <button key={label} type="button" aria-pressed={style.y === value} onClick={() => restyle({ y: value })} className={cn(CHOICE, "flex-1", style.y === value ? "border-primary text-ink" : "border-hairline text-ink-soft hover:text-ink")}>
              {label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}
