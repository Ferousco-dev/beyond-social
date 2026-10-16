"use client";

import type { GenerateFormValues } from "./types";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  );
}

/** Step A: what the video is for and who it is for. */
export function StepObjective({
  values,
  onChange,
}: {
  values: GenerateFormValues;
  onChange: (patch: Partial<GenerateFormValues>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Objective">
        <input
          value={values.objective}
          onChange={(event) => onChange({ objective: event.target.value })}
          placeholder="Promote my new serum"
          className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary sm:col-span-2"
        />
      </Field>
      <Field label="Video purpose">
        <select
          value={values.purpose}
          onChange={(event) => onChange({ purpose: event.target.value })}
          className={`${fieldClass} cursor-pointer`}
        >
          <option value="">Choose a purpose</option>
          <option value="promotion">Promotion</option>
          <option value="brand-awareness">Brand awareness</option>
          <option value="education">Education</option>
          <option value="product-demonstration">Product demonstration</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Target audience">
        <input
          value={values.audience}
          onChange={(event) => onChange({ audience: event.target.value })}
          placeholder="Women 25–34 into skincare"
          className={fieldClass}
        />
      </Field>
      <Field label="Product or service">
        <input
          value={values.product}
          onChange={(event) => onChange({ product: event.target.value })}
          placeholder="Glow serum"
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country">
          <input
            value={values.country}
            onChange={(event) => onChange({ country: event.target.value })}
            placeholder="United States"
            className={fieldClass}
          />
        </Field>
        <Field label="Language">
          <input
            value={values.language}
            onChange={(event) => onChange({ language: event.target.value })}
            className={fieldClass}
          />
        </Field>
      </div>
    </div>
  );
}
