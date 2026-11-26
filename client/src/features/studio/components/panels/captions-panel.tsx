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

const SWATCH = "size-6 cursor-pointer appearance-none overflow-hidden rounded-md border border-hairline bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:border-0";

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
    <div className="space-y-4 p-3">
      <div className="space-y-1.5">
        <button type="button" disabled={!clip || busy} onClick={() => void generate()} className="btn btn-primary btn-sm w-full">
          {busy ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {busy ? "Listening" : "Generate captions"}
        </button>
        {!clip ? <p className="text-xs text-ink-soft">Add a video or audio clip first.</p> : null}
      </div>

      <Field label="Style">
        <div className="grid grid-cols-3 gap-1.5">
          {CAPTION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={(style.preset ?? "classic") === preset}
              onClick={() => restyle({ preset })}
              className={cn("flex h-11 cursor-pointer flex-col items-center justify-center rounded-lg border bg-canvas text-[10px] leading-3 text-ink-soft focus-visible:outline-2 focus-visible:outline-primary", (style.preset ?? "classic") === preset ? "border-primary" : "border-hairline hover:border-ink-soft")}
            >
              <span className="text-xs font-extrabold leading-4 text-ink">
                Watch <span style={preset === "karaoke" || preset === "pill" ? { color: style.highlight ?? "#ffd400" } : undefined}>this</span>
              </span>
              {PRESET_LABEL[preset]}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex items-center gap-4 text-xs text-ink-soft">
        <label className="flex cursor-pointer items-center gap-2">
          Text
          <input type="color" aria-label="Caption text colour" value={style.color} onChange={(e) => restyle({ color: e.target.value })} className={SWATCH} />
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          Highlight
          <input type="color" aria-label="Caption highlight colour" value={style.highlight ?? "#ffd400"} onChange={(e) => restyle({ highlight: e.target.value })} className={SWATCH} />
        </label>
      </div>

      <Segmented label="Size" options={SIZES} value={style.size} onPick={(size) => restyle({ size })} />
      <Segmented label="Position" options={POSITIONS} value={style.y} onPick={(y) => restyle({ y })} />
    </div>
  );
}

/** A label on the left and a small joined set of choices on the right, one row tall. */
function Segmented({ label, options, value, onPick }: { label: string; options: readonly { label: string; value: number }[]; value: number | undefined; onPick: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-soft">{label}</span>
      <div role="group" aria-label={label} className="flex rounded-lg border border-hairline p-0.5">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onPick(option.value)}
            className={cn("h-6 cursor-pointer rounded-md px-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary", value === option.value ? "bg-primary/10 font-medium text-primary" : "text-ink-soft hover:text-ink")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
