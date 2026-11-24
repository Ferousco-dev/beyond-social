"use client";

import { ChoiceSelect } from "@/components/ui/choice-select";
import { Select } from "@/components/ui/select";

import { PacingNote } from "./length-picker";
import { CTA_OPTIONS } from "./options";
import { isLong, spokenText } from "./pacing";
import { TONES, isTalking, type GenerateFormValues } from "./types";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";
const areaClass =
  "w-full rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";

/** The words: what opens the video, what happens, what is said, and how it closes. */
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
        What happens, scene by scene
        <textarea value={values.scenes} onChange={(event) => onChange({ scenes: event.target.value })} rows={5} className={areaClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        What is said
        <textarea value={values.dialogue} onChange={(event) => onChange({ dialogue: event.target.value })} rows={3} className={areaClass} />
      </label>
      {isTalking(values) ? (
        <p role="note" className="-mt-2 rounded-xl border border-hairline bg-cloud/50 px-3 py-2 text-xs leading-relaxed text-ink-soft">
          Your saved person speaks their own voice recording, not this text. Write here what the recording says, so the script and the audio match.
        </p>
      ) : null}
      {!isTalking(values) && !isLong(values.seconds) ? (
        <PacingNote spoken={spokenText(values)} seconds={values.seconds} onPick={(seconds) => onChange({ seconds })} />
      ) : null}
      <ChoiceSelect
        label="Call to action"
        options={CTA_OPTIONS}
        value={values.cta}
        onChange={(cta) => onChange({ cta })}
        customPlaceholder="Write your own call to action"
        emptyLabel="None"
      />
      <details className="rounded-xl border border-hairline px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Language and tone <span className="font-normal text-ink-soft">(optional)</span>
        </summary>
        <div className="mt-3">
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
        </div>
      </details>
    </div>
  );
}
