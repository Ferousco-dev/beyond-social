"use client";

import { useEffect, useState } from "react";

/**
 * What the assistant is doing while it works.
 *
 * A bare spinner tells the user only that something is happening, which after
 * three seconds reads as broken. These are the real stages of the turn, in the
 * order they occur, so the wait becomes legible rather than merely long.
 *
 * The timings are honest about the work: classification is fast, grounding the
 * prompt against the knowledge base is the slow part, and the render request is
 * last. Nothing here claims a stage has finished, only that it has begun.
 */

interface Stage {
  readonly label: string;
  /** Milliseconds after send that this stage starts. */
  readonly atMs: number;
}

const STAGES: readonly Stage[] = [
  { label: "Reading your brief", atMs: 0 },
  { label: "Choosing the shot and the light", atMs: 1200 },
  { label: "Writing the direction", atMs: 3200 },
  { label: "Sending it to the renderer", atMs: 6000 },
  // Past here the render is genuinely queued and the wait is the provider's.
  { label: "Rendering, this part takes a minute", atMs: 12000 },
];

export function ThinkingIndicator() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 400);
    return () => window.clearInterval(timer);
  }, []);

  const stage = [...STAGES].reverse().find((entry) => elapsed >= entry.atMs) ?? STAGES[0];

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
      <span aria-live="polite">{stage?.label}</span>
    </div>
  );
}
