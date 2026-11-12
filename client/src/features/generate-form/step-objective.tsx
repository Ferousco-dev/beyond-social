"use client";

import { useState } from "react";

import { AudiencePicker } from "./audience-picker";
import type { GenerateFormValues } from "./types";
import { Select } from "@/components/ui/select";

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
  if (values.objective.trim() === "") errors["objective"] = "Say what the video is for, for example: Promote my new serum.";
  if (values.purpose === "other" && values.purposeOther.trim() === "") errors["purposeOther"] = "Say what the purpose is, or pick one from the list.";
  return errors;
}

/** Step A: what the video is for and who it is for. */
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
    <div className="flex flex-col gap-3">
      <Field label="Objective" error={errorFor("objective")}>
        <input
          id="field-objective"
          aria-invalid={errorFor("objective") !== null}
          value={values.objective}
          onBlur={() => leave("objective")}
          onChange={(event) => onChange({ objective: event.target.value })}
          placeholder="Promote my new serum"
          className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
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
        <input
          value={values.product}
          onChange={(event) => onChange({ product: event.target.value })}
          placeholder="Glow serum"
          className={fieldClass}
        />
      </Field>
      <Field label="Country" optional>
        <input
          value={values.country}
          onChange={(event) => onChange({ country: event.target.value })}
          placeholder="United States"
          className={fieldClass}
        />
      </Field>
    </div>
  );
}
