"use client";

import { type ReactNode } from "react";

import { HEYGEN_CONSENT_SECONDS, heygenConsentStatement } from "@/features/live-avatar/consent";

/**
 * What to say, and when, while the camera is rolling.
 *
 * A twin trained on one static sentence looks like a person reciting one
 * static sentence, so the recording is prompted in three parts: the consent
 * statement, a stretch of natural speech, and a still, quiet beat at the end.
 * The last one is not padding. The training pass wants a clean neutral frame,
 * and asking for it explicitly is the difference between getting one and
 * hoping the person happens to stop moving.
 *
 * The consent statement doing double duty as the opening line is the same idea
 * as the voice enrolment phrase: the attestation and the training data are the
 * same few seconds, so nobody is asked to perform twice.
 */

export interface Cue {
  readonly at: number;
  readonly title: string;
  readonly body: string;
}

/** The natural-speech stretch is the longest, because variety is what it buys. */
const SPEAK_SECONDS = 25;

export function twinCues(name: string): readonly Cue[] {
  return [
    {
      at: 0,
      title: "Read this out, in your normal voice",
      body: heygenConsentStatement(name),
    },
    {
      at: HEYGEN_CONSENT_SECONDS,
      title: "Now just talk, however you like",
      body: "Say what you make videos about, and who they are for. Keep your hands in frame and move the way you normally would. There is no wrong answer here; the point is your ordinary voice and gestures, not the words.",
    },
    {
      at: HEYGEN_CONSENT_SECONDS + SPEAK_SECONDS,
      title: "Stop talking and hold still",
      body: "Look at the camera, relax your face, and stay there for a few seconds. Blink normally. This gives the model one clean frame of you at rest.",
    },
  ];
}

export function cueAt(cues: readonly Cue[], seconds: number): Cue | undefined {
  return [...cues].reverse().find((cue) => seconds >= cue.at);
}

export function CueCard({
  cues,
  seconds,
  recording,
}: {
  cues: readonly Cue[];
  seconds: number;
  recording: boolean;
}): ReactNode {
  const current = cueAt(cues, seconds);
  const index = current ? cues.indexOf(current) : 0;

  return (
    <div className="rounded-xl border border-hairline bg-cloud/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          {recording ? current?.title : "You will be prompted through three short steps"}
        </p>
        <ol className="flex shrink-0 items-center gap-1.5" aria-label="Recording steps">
          {cues.map((cue, at) => (
            <li
              key={cue.at}
              aria-current={recording && at === index ? "step" : undefined}
              className={
                recording && at === index
                  ? "size-2 rounded-full bg-primary"
                  : recording && at < index
                    ? "size-2 rounded-full bg-primary/40"
                    : "size-2 rounded-full bg-hairline"
              }
            />
          ))}
        </ol>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {recording
          ? current?.body
          : "Read a short consent line, talk naturally for a moment, then hold still. Around a minute in total."}
      </p>
    </div>
  );
}
