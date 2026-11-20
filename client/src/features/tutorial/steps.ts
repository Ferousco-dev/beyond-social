export type TutorialTrackId = "dashboard" | "editor";

export interface TutorialStep {
  readonly id: string;
  /** Matches `[data-tip-anchor="<anchor>"]` in the DOM. */
  readonly anchor: string;
  readonly title: string;
  readonly body: string;
  /** Short action hint shown like a game objective pill. */
  readonly actionHint?: string;
  /** Preferred side for the coach card relative to the anchor. */
  readonly placement?: "top" | "bottom" | "left" | "right";
  /** When true, clicking the highlighted anchor advances to the next step automatically. */
  readonly advanceOnInteract?: boolean;
}

export const TUTORIAL_TRACKS: Readonly<Record<TutorialTrackId, readonly TutorialStep[]>> = {
  dashboard: [
    {
      id: "pick-start",
      anchor: "new-video-options",
      title: "Start your first video",
      body: "Pick any starting point — your own idea, a reference link, a trending clip, or a saved avatar.",
      actionHint: "Click a card to begin",
      placement: "bottom",
      advanceOnInteract: true,
    },
    {
      id: "assets-library",
      anchor: "nav-assets",
      title: "Save reusable assets",
      body: "Upload faces, voices, products, and music once so every new video can reuse them.",
      placement: "right",
    },
    {
      id: "projects-hub",
      anchor: "nav-projects",
      title: "Reopen any project",
      body: "Every video you generate is saved here so you can jump back into the editor anytime.",
      placement: "right",
    },
  ],
  editor: [
    {
      id: "studio-tools",
      anchor: "studio-tools",
      title: "Add media, captions & music",
      body: "Upload clips, auto-generate captions, drop in text, or add your own background music.",
      placement: "right",
    },
    {
      id: "studio-ai",
      anchor: "studio-ai",
      title: "Edit by asking AI",
      body: "Tell the AI to cut clips, add titles, speed up scenes, or generate the next shot.",
      placement: "left",
    },
    {
      id: "studio-timeline",
      anchor: "studio-timeline",
      title: "Trim & split scenes",
      body: "Drag clip edges to trim, press B to split at the playhead, or use Split scenes to separate shots automatically.",
      placement: "top",
    },
    {
      id: "studio-export",
      anchor: "studio-export",
      title: "Export or post directly",
      body: "When your edit looks right, download it or schedule it straight to YouTube, TikTok, or Instagram.",
      placement: "bottom",
    },
  ],
};

export interface TutorialProgress {
  readonly completed: readonly TutorialTrackId[];
}

export function parseProgress(raw: string | null): TutorialProgress {
  if (!raw) return { completed: [] };
  try {
    const parsed = JSON.parse(raw) as { completed?: unknown };
    if (!Array.isArray(parsed.completed)) return { completed: [] };
    const valid = parsed.completed.filter((id): id is TutorialTrackId => id === "dashboard" || id === "editor");
    return { completed: [...new Set(valid)] };
  } catch {
    return { completed: [] };
  }
}

export function isTrackCompleted(progress: TutorialProgress, track: TutorialTrackId): boolean {
  return progress.completed.includes(track);
}

export function markTrackCompleted(progress: TutorialProgress, track: TutorialTrackId): TutorialProgress {
  if (progress.completed.includes(track)) return progress;
  return { completed: [...progress.completed, track] };
}

export function resetTrack(progress: TutorialProgress, track: TutorialTrackId): TutorialProgress {
  return { completed: progress.completed.filter((id) => id !== track) };
}
