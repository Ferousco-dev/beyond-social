"use client";

import { HelpCircle } from "lucide-react";
import { type ReactNode } from "react";

import { type TourId } from "./steps";
import { replayTour } from "./tour-runner";

/** The header's help button: plays the guided tour again from the start. */
export function TourButton({ tour }: { tour: TourId }): ReactNode {
  return (
    <button
      type="button"
      onClick={() => replayTour(tour)}
      title="Show me around"
      aria-label="Show me around"
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
    >
      <HelpCircle className="size-4" aria-hidden />
    </button>
  );
}
