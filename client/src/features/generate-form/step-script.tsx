"use client";

import { ChoiceChips } from "@/components/ui/choice-chips";
import { Select } from "@/components/ui/select";

import { PacingNote } from "./length-picker";
import { CTA_OPTIONS, MUSIC_OPTIONS } from "./options";
import { spokenText } from "./pacing";
import { TONES, isTalking, type GenerateFormValues } from "./types";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";
const areaClass =
  "w-full rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";

/** Step C: the words, the voice, and the close. */
export function StepScript({
  values,
  onChange,
}: {
  values: GenerateFormValues;
  onChange: (patch: Partial<GenerateFormValues>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Opening hook
        <textarea value={values.hook} onChange={(event) => onChange({ hook: event.target.value })} rows={2} className={areaClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Scene-by-scene script
        <textarea value={values.scenes} onChange={(event) => onChange({ scenes: event.target.value })} rows={5} className={areaClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Dialogue or narration
        <textarea value={values.dialogue} onChange={(event) => onChange({ dialogue: event.target.value })} rows={3} className={areaClass} />
      </label>
      {!isTalking(values) ? (
        <PacingNote spoken={spokenText(values)} seconds={values.seconds} onPick={(seconds) => onChange({ seconds })} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Language
          <input
            value={values.language}
            onChange={(event) => onChange({ language: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Tone and delivery
          <Select value={values.tone} onValueChange={(tone) => onChange({ tone })} options={TONES.map((tone) => ({ value: tone, label: tone }))} />
        </label>
      </div>
      <ChoiceChips
        label="Call to action"
        options={CTA_OPTIONS}
        value={values.cta}
        onChange={(cta) => onChange({ cta })}
        customPlaceholder="Write your own call to action"
      />
      <ChoiceChips label="Background music" options={MUSIC_OPTIONS} value={values.music} onChange={(music) => onChange({ music })} />
    </div>
  );
}
