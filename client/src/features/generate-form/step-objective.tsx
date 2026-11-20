"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { AudiencePicker } from "./audience-picker";
import { COUNTRIES } from "./countries";
import { LengthPicker } from "./length-picker";
import { spokenText, toVideoLength } from "./pacing";
import { VisualLookPicker } from "./visual-look-picker";
import { CONTENT_KINDS, PLATFORMS, RATIOS, type GenerateFormValues } from "./types";
import { ChoiceSelect } from "@/components/ui/choice-select";
import { Select } from "@/components/ui/select";

const OBJECTIVES = [
  "Promote my product or service",
  "Get more followers",
  "Teach something useful",
  "Announce something new",
  "Tell my story or my brand's story",
  "Share a quick tip",
  "Show behind the scenes",
  "Get people to book or sign up",
].map((text) => ({ value: text, label: text }));

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";

function Field({
  label,
  optional = false,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className={labelClass}>
      <span>
        {label}
        {optional ? <span className="font-normal text-ink-soft"> (optional)</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-xs font-normal text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** What stops this step from continuing, keyed by the field's id. */
export function objectiveErrors(values: Pick<GenerateFormValues, "objective" | "purpose" | "purposeOther">): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};
  if (values.objective.trim() === "") errors["objective"] = "Choose what the video is for, or pick Custom and write your own.";
  if (values.purpose === "other" && values.purposeOther.trim() === "") errors["purposeOther"] = "Say what the purpose is, or pick one from the list.";
  return errors;
}

/** A row of exclusive choices drawn as one segmented control. */
function Segmented<T extends string>({ label, options, value, onPick }: { label: string; options: readonly T[]; value: T; onPick: (next: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      <div className="flex rounded-[10px] border border-hairline p-1" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onPick(option)}
            aria-pressed={value === option}
            className={cn(
              "h-9 flex-1 cursor-pointer rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              value === option ? "bg-cloud font-medium text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Step one: the few things every video needs. What it is for, how long, where it
 * is posted and the look. Everything else has a sensible default and sits under
 * "More options", so nobody has to answer a question they do not care about.
 */
export function StepObjective({
  values,
  onChange,
  showErrors,
}: {
  values: GenerateFormValues;
  onChange: (patch: Partial<GenerateFormValues>) => void;
  /** True after a failed Continue, so every problem shows at once. */
  showErrors: boolean;
}) {
  // A field reports its problem once it has been left, then clears the moment it is fixed.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const errors = objectiveErrors(values);
  const errorFor = (key: string): string | null => (errors[key] && (showErrors || touched.has(key)) ? errors[key] : null);
  const leave = (key: string): void => setTouched((current) => new Set(current).add(key));

  return (
    <div className="flex flex-col gap-5">
      <Field label="Project title" optional>
        <input
          id="field-title"
          value={values.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="e.g. Summer serum launch"
          maxLength={120}
          className={fieldClass}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <ChoiceSelect
          id="field-objective"
          label="What is the video for?"
          options={OBJECTIVES}
          value={values.objective}
          onChange={(objective) => {
            onChange({ objective });
            leave("objective");
          }}
          customPlaceholder="Say it in your own words, e.g. Promote my new serum"
          emptyLabel="Choose one…"
          invalid={errorFor("objective") !== null}
        />
        {errorFor("objective") ? (
          <span role="alert" className="text-xs text-destructive">
            {errorFor("objective")}
          </span>
        ) : null}
      </div>
      <LengthPicker value={toVideoLength(values.seconds)} onChange={(seconds) => onChange({ seconds })} spoken={spokenText(values)} contentKind={values.contentKind} />
      <Segmented label="Post it on" options={PLATFORMS} value={values.platform as (typeof PLATFORMS)[number]} onPick={(platform) => onChange({ platform })} />
      <VisualLookPicker only="style" style={values.visualStyle} environment={values.environment} onChange={onChange} />

      <details open={values.purpose === "other" || errorFor("purposeOther") !== null} className="rounded-xl border border-hairline px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          More options <span className="font-normal text-ink-soft">(optional)</span>
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Video purpose">
            <Select
              value={values.purpose}
              onValueChange={(purpose) => onChange({ purpose })}
              options={[
                { value: "promotion", label: "Promotion" },
                { value: "brand-awareness", label: "Brand awareness" },
                { value: "education", label: "Education" },
                { value: "product-demonstration", label: "Product demonstration" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          {values.purpose === "other" ? (
            <Field label="Specify the purpose" error={errorFor("purposeOther")}>
              <input
                id="field-purposeOther"
                aria-invalid={errorFor("purposeOther") !== null}
                onBlur={() => leave("purposeOther")}
                value={values.purposeOther}
                onChange={(event) => onChange({ purposeOther: event.target.value })}
                placeholder="Recruiting for my team"
                maxLength={120}
                className={fieldClass}
              />
            </Field>
          ) : null}
          <AudiencePicker value={values.audience} onChange={(audience) => onChange({ audience })} />
          <Field label="Product or service" optional>
            <input value={values.product} onChange={(event) => onChange({ product: event.target.value })} placeholder="Glow serum" className={fieldClass} />
          </Field>
          <ChoiceSelect label="Country (optional)" options={COUNTRIES} value={values.country} onChange={(country) => onChange({ country })} customPlaceholder="Type a country" emptyLabel="Anywhere" />
          <Segmented label="Shape" options={RATIOS} value={values.aspectRatio} onPick={(aspectRatio) => onChange({ aspectRatio })} />
          <Field label="Content">
            <Select
              aria-label="Content"
              value={values.contentKind}
              onValueChange={(contentKind) => onChange({ contentKind })}
              options={CONTENT_KINDS.map((kind) => ({ value: kind, label: kind }))}
            />
          </Field>
          <VisualLookPicker only="environment" style={values.visualStyle} environment={values.environment} onChange={onChange} />
        </div>
      </details>
    </div>
  );
}
