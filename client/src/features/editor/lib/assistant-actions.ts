import {
  isAudio,
  isText,
  isVideo,
  type AudioItem,
  type TextItem,
  type VideoItem,
} from "@/lib/editor/types";

import { type EditorState } from "../hooks/use-editor-state";

/**
 * The assistant's repertoire. Each action is a real, deterministic edit against
 * the project, so the panel changes the timeline rather than describing changes
 * it cannot make. Every one returns the sentence shown back in the thread.
 */
export interface AssistantAction {
  readonly id: string;
  readonly label: string;
  /** Words that should trigger this action when typed free-form. */
  readonly keywords: readonly string[];
  readonly run: (editor: EditorState) => string;
}

function videoItems(editor: EditorState): VideoItem[] {
  return editor.project.tracks.flatMap((track) => track.items.filter(isVideo));
}

export const ASSISTANT_ACTIONS: readonly AssistantAction[] = [
  {
    id: "transitions",
    label: "Add fades between shots",
    keywords: ["fade", "transition", "smooth", "blend"],
    run: (editor) => {
      const clips = videoItems(editor);
      // The opening shot has nothing to transition from, so it keeps a hard cut.
      const targets = clips.slice(1);
      targets.forEach((clip) =>
        editor.update<VideoItem>(
          clip.id,
          { transitionIn: "dissolve", transitionMs: 400 },
          "assistant:transitions",
        ),
      );
      return `Added a 0.4s dissolve to ${targets.length} shots. Cuts on the opener stay hard.`;
    },
  },
  {
    id: "punch",
    label: "Punchier colour",
    keywords: ["colour", "color", "grade", "punch", "vivid", "contrast"],
    run: (editor) => {
      const clips = videoItems(editor);
      clips.forEach((clip) =>
        editor.update<VideoItem>(
          clip.id,
          { filters: { ...clip.filters, contrast: 1.25, saturation: 1.3 } },
          "assistant:punch",
        ),
      );
      return `Lifted contrast and saturation across ${clips.length} clips. Undo if it reads too hot.`;
    },
  },
  {
    id: "captions",
    label: "Make captions bolder",
    keywords: ["caption", "text", "subtitle", "bigger", "bold", "readable"],
    run: (editor) => {
      const captions = editor.project.tracks.flatMap((track) => track.items.filter(isText));
      captions.forEach((caption) =>
        editor.update<TextItem>(
          caption.id,
          { style: { ...caption.style, fontSize: 44, bold: true, uppercase: true } },
          "assistant:captions",
        ),
      );
      return `Set ${captions.length} captions to 44px, bold and uppercase, so they hold up on a phone.`;
    },
  },
  {
    id: "slowmo",
    label: "Slow-mo the hero shot",
    keywords: ["slow", "slowmo", "slow motion", "retime", "speed"],
    run: (editor) => {
      const clips = videoItems(editor);
      // The longest shot is almost always the hero beat.
      const hero = clips.reduce<VideoItem | null>(
        (longest, clip) => (!longest || clip.durationMs > longest.durationMs ? clip : longest),
        null,
      );
      if (!hero) return "There is no footage on the timeline yet.";
      const sourceMs = hero.durationMs * hero.speed;
      const newDurationMs = Math.round(sourceMs / 0.5);
      const growth = newDurationMs - hero.durationMs;
      const heroEndMs = hero.startMs + hero.durationMs;

      editor.update<VideoItem>(
        hero.id,
        { speed: 0.5, durationMs: newDurationMs },
        "assistant:slowmo",
      );

      /*
       * Halving the speed doubles how long the hero shot occupies the
       * timeline, and nothing else moves on its own: `editor.update` is a
       * plain patch, not a resize, so the clip that used to start right after
       * it now overlaps however much longer this one runs. Every later item
       * on the same track shifts forward by the same amount to keep the cut
       * order the timeline had before this ran.
       */
      const track = editor.project.tracks.find((candidate) =>
        candidate.items.some((item) => item.id === hero.id),
      );
      track?.items
        .filter((item) => item.id !== hero.id && item.startMs >= heroEndMs)
        .forEach((item) =>
          editor.update(item.id, { startMs: item.startMs + growth }, "assistant:slowmo"),
        );

      return `Halved the speed on "${hero.label}", the longest shot, so it now runs ${(sourceMs / 0.5 / 1000).toFixed(1)}s.`;
    },
  },
  {
    id: "duck",
    label: "Duck the music",
    keywords: ["music", "volume", "quiet", "duck", "loud", "audio"],
    run: (editor) => {
      const beds = editor.project.tracks.flatMap((track) => track.items.filter(isAudio));
      beds.forEach((bed) =>
        editor.update<AudioItem>(
          bed.id,
          { volume: 0.25, fadeInMs: 1000, fadeOutMs: 1500 },
          "assistant:duck",
        ),
      );
      return `Dropped the bed to 25% with longer fades, so a voiceover would sit on top cleanly.`;
    },
  },
];

/** Picks the action whose keywords best match a free-form instruction. */
export function matchAction(input: string): AssistantAction | undefined {
  const text = input.toLowerCase();
  let best: { action: AssistantAction; score: number } | undefined;
  for (const action of ASSISTANT_ACTIONS) {
    const score = action.keywords.filter((word) => text.includes(word)).length;
    if (score > 0 && (!best || score > best.score)) best = { action, score };
  }
  return best?.action;
}
