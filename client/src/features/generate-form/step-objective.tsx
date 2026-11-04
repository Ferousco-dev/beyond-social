"use client";

import { AudiencePicker } from "./audience-picker";
import type { GenerateFormValues } from "./types";
import { Select } from "@/components/ui/select";

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
        <Field label="Specify the purpose">
          <input
            value={values.purposeOther}
            onChange={(event) => onChange({ purposeOther: event.target.value })}
            placeholder="Recruiting for my team"
            maxLength={120}
            required
            className={fieldClass}
          />
        </Field>
      ) : null}
      <AudiencePicker value={values.audience} onChange={(audience) => onChange({ audience })} />
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
