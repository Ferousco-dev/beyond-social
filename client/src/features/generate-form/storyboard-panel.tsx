"use client";

import { ArrowDown, ArrowUp, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { longStory } from "./start-generation";
import { wordCount, speechSeconds } from "./pacing";
import { MAX_SHOT, MAX_SHOTS, MIN_SHOT, addShot, basisOf, editShot, gap, isStale, moveShot, removeShot, totalSeconds, type Shot, type Storyboard } from "./storyboard";
import { writeStoryboard } from "./storyboard-actions";
import type { GenerateFormValues } from "./types";
import { VoiceoverPanel } from "./voiceover-panel";

const areaClass =
  "w-full rounded-[10px] border border-hairline bg-paper px-3 py-2 text-sm leading-relaxed text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";
const iconButton =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

function minutes(seconds: number): string {
  return seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : `${seconds}s`;
}

/**
 * The plan for a long video, written for the length the person chose and open
 * to edit before anything is rendered. Changing the length or the script marks
 * the plan out of date and offers a rewrite; it never replaces edits on its own.
 */
export function StoryboardPanel({ values, onChange }: { values: GenerateFormValues; onChange: (patch: Partial<GenerateFormValues>) => void }) {
  const plan = values.storyboard;
  const script = longStory(values);
  const basis = { seconds: values.seconds, script };
  const stale = isStale(plan, basis);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A second click while one request is out would pay twice.
  const inFlight = useRef(false);

  async function write(): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await writeStoryboard({ script, seconds: values.seconds, look: [values.visualStyle, values.environment].filter(Boolean).join(". "), language: values.language });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onChange({ storyboard: { title: result.title, look: result.look, shots: result.shots, basis: basisOf(basis) } });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const update = (next: Storyboard): void => onChange({ storyboard: next });

  if (!plan) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-paper p-4" aria-label="Storyboard">
        <div>
          <h3 className="text-sm font-semibold text-ink">Storyboard for {minutes(values.seconds)}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            A long video is planned as short shots first. The plan is written for {minutes(values.seconds)}, so a longer or shorter length gets more or fewer shots, and you can edit every one before anything is rendered.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void write()}
          disabled={busy || script.trim() === ""}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {busy ? `Writing a ${minutes(values.seconds)} storyboard…` : `Write the ${minutes(values.seconds)} storyboard`}
        </button>
        {script.trim() === "" ? <p className="text-xs text-ink-soft">Write the opening, the scenes or the narration above first.</p> : null}
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-ink-soft">Uses a few credits. They are returned if the storyboard cannot be written.</p>
      </section>
    );
  }

  const total = totalSeconds(plan.shots);
  const difference = gap(plan, values.seconds);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-paper p-4" aria-label="Storyboard">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{plan.title !== "" ? plan.title : "Storyboard"}</h3>
          <p className="mt-0.5 text-xs text-ink-soft tabular-nums" role="status">
            {plan.shots.length} shots · {minutes(total)} of {minutes(values.seconds)}
            {difference.kind === "short" ? ` · ${difference.by}s to add` : difference.kind === "over" ? ` · ${difference.by}s too long` : " · ready"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void write()}
          disabled={busy}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 text-[13px] text-ink transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
          {busy ? "Rewriting…" : "Rewrite"}
        </button>
      </div>

      {stale ? (
        <p role="status" className="rounded-xl border border-hairline bg-cloud/60 px-3 py-2 text-xs text-ink">
          The length or the script changed since this was written. Your edits are kept until you press Rewrite, which writes a new {minutes(values.seconds)} plan and replaces them.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-xs font-medium text-ink">
        Look shared by every shot
        <textarea value={plan.look} onChange={(event) => update({ ...plan, look: event.target.value })} rows={2} className={areaClass} />
      </label>

      <ol className="flex flex-col gap-2">
        {plan.shots.map((shot, index) => (
          <ShotCard key={shot.id} shot={shot} index={index} last={index === plan.shots.length - 1} plan={plan} update={update} />
        ))}
      </ol>

      <VoiceoverPanel values={values} onChange={onChange} />

      <button
        type="button"
        onClick={() => update(addShot(plan))}
        disabled={plan.shots.length >= MAX_SHOTS}
        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-full border border-hairline px-3.5 text-[13px] text-ink transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="size-3.5" aria-hidden /> Add a shot
      </button>
    </section>
  );
}

function ShotCard({ shot, index, last, plan, update }: { shot: Shot; index: number; last: boolean; plan: Storyboard; update: (next: Storyboard) => void }) {
  const words = wordCount(shot.voiceover);
  const rushed = words > 0 && speechSeconds(shot.voiceover) > shot.seconds;
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-hairline p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-soft tabular-nums">Shot {index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`Shorten shot ${index + 1}`} disabled={shot.seconds <= MIN_SHOT} onClick={() => update(editShot(plan, shot.id, { seconds: shot.seconds - 1 }))} className={iconButton}>
            <Minus className="size-3.5" aria-hidden />
          </button>
          <span className="w-8 text-center text-sm tabular-nums text-ink">{shot.seconds}s</span>
          <button type="button" aria-label={`Lengthen shot ${index + 1}`} disabled={shot.seconds >= MAX_SHOT} onClick={() => update(editShot(plan, shot.id, { seconds: shot.seconds + 1 }))} className={iconButton}>
            <Plus className="size-3.5" aria-hidden />
          </button>
          <button type="button" aria-label={`Move shot ${index + 1} up`} disabled={index === 0} onClick={() => update(moveShot(plan, shot.id, -1))} className={iconButton}>
            <ArrowUp className="size-3.5" aria-hidden />
          </button>
          <button type="button" aria-label={`Move shot ${index + 1} down`} disabled={last} onClick={() => update(moveShot(plan, shot.id, 1))} className={iconButton}>
            <ArrowDown className="size-3.5" aria-hidden />
          </button>
          <button type="button" aria-label={`Remove shot ${index + 1}`} disabled={plan.shots.length <= 1} onClick={() => update(removeShot(plan, shot.id))} className={iconButton}>
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink">
        What we see
        <textarea value={shot.visual} onChange={(event) => update(editShot(plan, shot.id, { visual: event.target.value }))} rows={2} className={areaClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink">
        What is said
        <textarea value={shot.voiceover} onChange={(event) => update(editShot(plan, shot.id, { voiceover: event.target.value }))} rows={2} className={areaClass} />
      </label>
      {rushed ? <p className="text-xs text-destructive">{words} words take about {Math.ceil(speechSeconds(shot.voiceover))}s to say, more than the {shot.seconds}s of this shot. Lengthen the shot or trim the words.</p> : null}
    </li>
  );
}
