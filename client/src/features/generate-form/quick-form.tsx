"use client";

import { type ReactNode } from "react";

import { Select } from "@/components/ui/select";

import { COUNTRIES } from "./countries";
import { LengthScroller } from "./length-scroller";
import { spokenText, toVideoLength } from "./pacing";
import { FormatPicker } from "./format-picker";
import { StepAssets } from "./step-assets";
import { ScriptEditor } from "./script-editor";
import { type GenerateFormValues } from "./types";
import { StylePicker } from "./style-picker";

const areaClass =
  "w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-soft/70 focus:outline-none focus:border-ink/30 focus:ring-4 focus:ring-ink/5";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Configure video on one screen: the idea, three quick picks, who is in it,
 * the script folded away, and one box for anything else. Every other detail
 * (audience, country, tone, language, call to action) is filled in by our AI
 * from the idea, and the Extras box is folded in when the person generates.
 */
export function QuickForm({
  values,
  onChange,
  ideaError,
}: {
  values: GenerateFormValues;
  onChange: (patch: Partial<GenerateFormValues>) => void;
  ideaError: string | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Section title="Your idea">
        <textarea
          id="field-idea"
          value={values.idea}
          onChange={(event) => onChange({ idea: event.target.value })}
          rows={2}
          maxLength={1000}
          placeholder="A 15-second promo for our new serum, showing a morning skincare routine"
          aria-invalid={ideaError !== null}
          className={areaClass}
        />
        {ideaError ? (
          <span role="alert" className="text-xs text-destructive">
            {ideaError}
          </span>
        ) : null}
      </Section>

      <div data-tour="video-basics" className="flex flex-col gap-6">
        <Section title="Length">
          <LengthScroller value={toVideoLength(values.seconds)} onChange={(seconds) => onChange({ seconds })} spoken={spokenText(values)} />
        </Section>

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <Section title="Format">
            <FormatPicker platform={values.platform} ratio={values.aspectRatio} onChange={onChange} />
          </Section>
          <div className="flex flex-col gap-2 sm:items-end">
            <h2 className="text-sm font-medium text-ink">Country</h2>
            <Select
              aria-label="Country"
              value={values.country}
              onValueChange={(country) => onChange({ country })}
              options={[{ value: "", label: "Anywhere" }, ...COUNTRIES]}
              className="h-8 w-44 text-[13px]"
            />
          </div>
        </div>
      </div>

      <Section title="Look" hint="Optional">
        <StylePicker value={values.visualStyle} onChange={(visualStyle) => onChange({ visualStyle })} />
      </Section>

      <div data-tour="video-assets">
        <Section title="Assets">
          <StepAssets values={values} onChange={onChange} />
        </Section>
      </div>

      <ScriptEditor values={values} onChange={onChange} />

      <Section title="Extras" hint="Optional">
        <textarea
          value={values.extras}
          onChange={(event) => onChange({ extras: event.target.value })}
          rows={2}
          maxLength={1000}
          placeholder="Want something different? For example: aim it at women in Lagos, make it funny, end with a discount code"
          className={areaClass}
        />
      </Section>
    </div>
  );
}
