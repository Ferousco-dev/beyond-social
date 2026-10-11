"use client";

import { useEffect, useState } from "react";

import { type TurnStage } from "@/lib/chat/turn";

/**
 * What the assistant is doing while it works.
 *
 * A bare spinner tells the user only that something is happening, which after
 * three seconds reads as broken.
 *
 * The stages used to advance on a timer: a list of labels with millisecond
 * offsets, guessed from how long each step usually takes. That is confidently
 * wrong the moment a step runs long, and it claimed the render had started
 * while the classifier was still going. They now come from the turn itself, so
 * the label is what is actually happening. The timer is only a fallback for a
 * caller that reports nothing.
 */

const LABELS: Readonly<Record<TurnStage, string>> = {
  understanding: "Reading your brief",
  recalling: "Remembering what you have made before",
  directing: "Choosing the shot and the light",
  rendering: "Sending it to the renderer",
  replying: "Writing back",
  saving: "Saving the turn",
};

/** Shown only when the turn reports nothing, which is the server action path. */
const UNTRACKED = "Working on that";

export function ThinkingIndicator({ stage }: { stage?: TurnStage | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 400);
    return () => window.clearInterval(timer);
  }, []);

  // The elapsed counter still drives the long-render line, which is the one
  // stage whose length nothing reports: past a minute the wait is the video
  // provider's and saying so is better than a label that stopped changing.
  const label = stage
    ? stage === "rendering" && elapsed > 12_000
      ? "Rendering, this part takes a minute"
      : LABELS[stage]
    : UNTRACKED;

  return (
    <div className="flex items-center gap-2.5 text-sm text-ink-soft">
      {/* Three dots rather than a spinner: a spinner implies a fixed operation,
          and this is a sequence whose length depends on what was asked. */}
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            style={{ animationDelay: `${index * 160}ms` }}
            className="size-1.5 rounded-full bg-ink-soft/70 motion-safe:animate-[pulse_1.2s_ease-in-out_infinite]"
          />
        ))}
      </span>
      {/* Announced politely so a screen reader hears the stage change without
          being interrupted mid-sentence. */}
      <span aria-live="polite">{label}</span>
    </div>
  );
}
