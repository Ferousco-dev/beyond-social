"use client";

import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";

import { fits, speechSeconds, spokenText } from "./pacing";
import { isTalking, type GenerateFormValues } from "./types";

const inputClass =
  "w-full rounded-lg border border-hairline bg-paper px-2.5 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-soft/70 focus:outline-none focus:border-ink/30 focus:ring-4 focus:ring-ink/5";

const time = (seconds: number): string => {
  const whole = Math.round(seconds);
  return whole >= 60 ? `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}` : `${whole}s`;
};

/** A stretch of the video, short: "0–5s", or "1:00–1:30" past a minute. */
const span = (from: number, to: number): string => {
  const end = time(to);
  const start = time(from);
  return end.endsWith("s") && start.endsWith("s") ? `${start.slice(0, -1)}–${end}` : `${start}–${end}`;
};

/** Scene lines without the "1." the AI numbers them with; the number is drawn beside each. */
function sceneLines(scenes: string): string[] {
  // Empty lines inside are kept, so clearing a scene to retype it does not remove its row.
  const lines = scenes.split("\n").map((line) => line.replace(/^\s*\d+[.)]\s*/u, ""));
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") lines.pop();
  return lines;
}

/**
 * The script, always open, laid out against the clock: each scene gets its
 * slice of the video, and the spoken words say how long they take to say
 * against the chosen length. The times are an even split, a guide rather than
 * the final cut.
 */
export function ScriptEditor({ values, onChange }: { values: GenerateFormValues; onChange: (patch: Partial<GenerateFormValues>) => void }) {
  const seconds = values.seconds;
  const lines = sceneLines(values.scenes);
  const slice = lines.length > 0 ? seconds / lines.length : seconds;
  const spoken = spokenText(values);
  const speech = speechSeconds(spoken);
  const tooLong = !isTalking(values) && !fits(spoken, seconds);

  function setLine(index: number, text: string): void {
    const next = [...lines];
    next[index] = text;
    onChange({ scenes: next.map((line, at) => `${at + 1}. ${line}`).join("\n") });
  }

  return (
    <div data-tour="video-script" className="flex flex-col gap-4 rounded-xl border border-hairline bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-ink">Script</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2 py-0.5 text-xs text-ink-soft">
          <Clock className="size-3" aria-hidden /> {time(seconds)} video
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-xs text-ink-soft">
          Opening line <span className="tabular-nums">{span(0, Math.min(3, seconds))}</span>
        </span>
        <input value={values.hook} onChange={(event) => onChange({ hook: event.target.value })} placeholder="The first thing people see or hear" className={inputClass} />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-soft">Scenes</span>
        {lines.length === 0 ? (
          <textarea
            value={values.scenes}
            onChange={(event) => onChange({ scenes: event.target.value })}
            rows={3}
            placeholder="One scene per line"
            className={inputClass}
          />
        ) : (
          <ol className="flex flex-col gap-1.5">
            {lines.map((line, index) => (
              <li key={index} className="flex items-start gap-1.5">
                <span className="mt-2.5 w-9 shrink-0 text-[10px] tabular-nums text-ink-soft">{span(index * slice, (index + 1) * slice)}</span>
                <textarea
                  value={line}
                  aria-label={`Scene ${index + 1}`}
                  onChange={(event) => setLine(index, event.target.value)}
                  rows={1}
                  className={`${inputClass} field-sizing-content min-h-9 resize-none py-1.5`}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between gap-3 text-xs text-ink-soft">
          What is said
          {spoken.trim() === "" || isTalking(values) ? null : (
            <span className={cn("tabular-nums", tooLong ? "font-medium text-destructive" : "")}>
              about {time(Math.ceil(speech))} to say{tooLong ? `, longer than ${time(seconds)}` : ""}
            </span>
          )}
        </span>
        <textarea value={values.dialogue} onChange={(event) => onChange({ dialogue: event.target.value })} rows={3} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-xs text-ink-soft">
          Call to action <span className="tabular-nums">{span(Math.max(0, seconds - 3), seconds)}</span>
        </span>
        <input value={values.cta} onChange={(event) => onChange({ cta: event.target.value })} placeholder="Shop now, link in bio" className={inputClass} />
      </label>
      {isTalking(values) ? (
        <p role="note" className="-mt-2 text-xs leading-relaxed text-ink-soft">
          Your saved person speaks their own recording, not this text. Write what the recording says, so the two match.
        </p>
      ) : null}
    </div>
  );
}
