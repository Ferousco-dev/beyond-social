"use client";

import { TONES, type GenerateFormValues } from "./types";

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
          <select
            value={values.tone}
            onChange={(event) => onChange({ tone: event.target.value })}
            className={`${fieldClass} cursor-pointer`}
          >
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Call to action
        <input value={values.cta} onChange={(event) => onChange({ cta: event.target.value })} placeholder="Shop the link below" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Background music (optional)
        <input value={values.music} onChange={(event) => onChange({ music: event.target.value })} placeholder="Upbeat lo-fi" className={fieldClass} />
      </label>
    </div>
  );
}
