/**
 * The guided tours, as data.
 *
 * "first-video" walks a new person from New Video to the Generate button,
 * across two pages; "editor" points out the editor's four areas. Each step
 * spotlights the element carrying `data-tour="<target>"`.
 */

export type TourId = "first-video" | "editor";

export interface TourStep {
  /** Matches `[data-tour="<target>"]`. */
  readonly target: string;
  /** The page the step lives on. Steps of one page run together. */
  readonly page: string;
  readonly title: string;
  readonly body: string;
  readonly side?: "top" | "right" | "bottom" | "left";
  /** The step moves on when the spotlighted element is clicked, rather than with Next. */
  readonly clickToContinue?: boolean;
}

export const TOURS: Readonly<Record<TourId, readonly TourStep[]>> = {
  "first-video": [
    {
      target: "new-video-idea",
      page: "/dashboard/new",
      title: "Make your first video",
      body: "Start here. All you need is a sentence about your video.",
      side: "bottom",
      clickToContinue: true,
    },
    {
      target: "idea-text",
      page: "/dashboard/new",
      title: "Say what it is about",
      body: "One or two sentences, like “A 15-second promo for my bakery’s new chocolate cake.”",
      side: "bottom",
    },
    {
      target: "idea-continue",
      page: "/dashboard/new",
      title: "Tap Continue",
      body: "Our AI writes the script and fills in the details for you.",
      side: "top",
      clickToContinue: true,
    },
    {
      target: "video-basics",
      page: "/dashboard/videos/new",
      title: "Length and format",
      body: "Pick how long the video runs and the size it is made for.",
      side: "bottom",
    },
    {
      target: "video-assets",
      page: "/dashboard/videos/new",
      title: "Who is in it",
      body: "Choose a saved person, product or place. Add your own anytime in Assets.",
      side: "bottom",
    },
    {
      target: "video-script",
      page: "/dashboard/videos/new",
      title: "Your script",
      body: "Every scene is timed against the video. Change any line you like.",
      side: "top",
    },
    {
      target: "video-generate",
      page: "/dashboard/videos/new",
      title: "Generate your video",
      body: "When it looks right, tap here. You see the price before anything is spent.",
      side: "top",
    },
  ],
  editor: [
    { target: "studio-tools", page: "/editor", title: "Add to your video", body: "Upload clips, add captions, text and music here.", side: "right" },
    { target: "studio-ai", page: "/editor", title: "Edit by asking", body: "Tell the assistant what to change: cut a clip, add a title, speed up a scene.", side: "left" },
    { target: "studio-timeline", page: "/editor", title: "Trim and split", body: "Drag a clip’s edges to trim it. Press B to split at the playhead.", side: "top" },
    { target: "studio-export", page: "/editor", title: "Download or post", body: "When the edit looks right, download it or post it to your accounts.", side: "bottom" },
  ],
};

/** Where a person is in each tour: the next step to show, or done. */
export interface TourProgress {
  readonly step: number;
  readonly done: boolean;
}

export function parseProgress(raw: string | null): TourProgress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { step?: unknown; done?: unknown };
    const step = typeof parsed.step === "number" && Number.isInteger(parsed.step) && parsed.step >= 0 ? parsed.step : 0;
    return { step, done: parsed.done === true };
  } catch {
    return null;
  }
}

/** Whether a pathname is the page a step lives on. The editor matches any project. */
export function onPage(step: TourStep, pathname: string): boolean {
  return step.page === "/editor" ? pathname.startsWith("/editor/") : pathname === step.page;
}

/** The run of steps from `from` that live on this page, as [first, last] indexes, or null. */
export function pageRun(steps: readonly TourStep[], from: number, pathname: string): readonly [number, number] | null {
  if (from >= steps.length || !onPage(steps[from]!, pathname)) return null;
  let last = from;
  while (last + 1 < steps.length && onPage(steps[last + 1]!, pathname)) last += 1;
  return [from, last];
}

/** Where to start on a page: the first step of the page that `step` belongs to, so a return visit begins that page again. */
export function pageStart(steps: readonly TourStep[], step: number): number {
  let from = Math.min(step, steps.length - 1);
  while (from > 0 && steps[from - 1]!.page === steps[from]!.page) from -= 1;
  return from;
}
