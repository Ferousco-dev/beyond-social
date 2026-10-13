"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { transcribeVideo } from "../../assist-actions";
import { captionsFromWords, DEFAULT_CAPTION_STYLE } from "../../core/captions.ts";
import { endOf, locate } from "../../core/find.ts";
import { replaceCaptions, restyleCaptions } from "../../core/ops.ts";
import { CAPTION_PRESETS, type CaptionPreset, type Item, type Project } from "../../core/types.ts";
import { makeId } from "../../lib/format";
import { selectProject, useStudio } from "../../store/editor-store";
import { Field } from "./field";

const PRESET_LABEL: Record<CaptionPreset, string> = { karaoke: "Karaoke", pill: "Pill", classic: "Classic", box: "Box", minimal: "Minimal" };
const SIZES = [{ label: "Small", value: 48 }, { label: "Medium", value: 64 }, { label: "Large", value: 84 }] as const;
const POSITIONS = [{ label: "Top", value: 0.15 }, { label: "Middle", value: 0.5 }, { label: "Bottom", value: 0.8 }] as const;
const CAPTION_CREDITS = 10;

type Video = Extract<Item, { kind: "video" }>;

function targetClip(project: Project, selection: string | null): Video | null {
  const chosen = selection ? locate(project, selection)?.item : undefined;
  if (chosen?.kind === "video") return chosen;
  const first = project.tracks.find((t) => t.kind === "video")?.items[0];
  return first?.kind === "video" ? first : null;
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
    const result = await transcribeVideo(clip.src);
    setBusy(false);
    if (!result.ok) return useStudio.getState().setNotice(result.message, result.code);
    const captions = captionsFromWords(result.words, clip, makeId, style);
    if (captions.length === 0) return useStudio.getState().setNotice("No speech was found in that clip.");
    useStudio.getState().edit((p) => replaceCaptions(p, clip.start, endOf(clip), captions));
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
        <p className="text-xs text-ink-soft">
          {clip ? `Listens to the selected clip, or the first one. Costs ${CAPTION_CREDITS} credits.` : "Add a video to the timeline first."}
        </p>
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
