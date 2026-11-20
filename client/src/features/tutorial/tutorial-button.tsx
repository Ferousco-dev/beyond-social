"use client";

import { HelpCircle } from "lucide-react";
import { type ReactNode } from "react";

import { type TutorialTrackId } from "./steps";
import { replayTutorial } from "./use-tutorial";

/** Compact header trigger to replay the contextual tutorial for the current screen. */
export function TutorialButton({ track }: { track: TutorialTrackId }): ReactNode {
  return (
    <button
      type="button"
      onClick={() => replayTutorial(track)}
      title="Quick walkthrough"
      aria-label="Replay quick walkthrough"
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
    >
      <HelpCircle className="size-4" aria-hidden />
    </button>
  );
}
