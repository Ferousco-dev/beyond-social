"use client";

import { ChevronDown, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

function Row({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-3.5 last:border-0">
      <div>
        <p className="text-sm text-ink">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-ink-soft">{description}</p> : null}
      </div>
      {control}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors",
        checked ? "bg-primary" : "bg-hairline",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="cursor-pointer appearance-none rounded-lg border border-hairline bg-paper py-1.5 pl-3 pr-8 text-sm text-ink transition-colors hover:bg-cloud focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
    </div>
  );
}

export function GeneralPanel() {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState("auto");
  const [higherQuality, setHigherQuality] = useState(true);

  return (
    <div>
      <div className="rounded-xl bg-cloud p-4">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-paper text-ink shadow-sm">
          <ShieldCheck className="size-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-ink">Secure your account</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Add multi-factor authentication (MFA), like an authenticator app, to help protect your
          account when signing in.
        </p>
        <button
          type="button"
          className="mt-3 cursor-pointer rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-cloud"
        >
          Set up MFA
        </button>
      </div>

      <div className="mt-4">
        <Row
          label="Appearance"
          control={
            <Select
              label="Appearance"
              value={theme ?? "system"}
              onChange={setTheme}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          }
        />
        <Row
          label="Language"
          control={
            <Select
              label="Language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: "auto", label: "Auto-detect" },
                { value: "en", label: "English" },
                { value: "es", label: "Spanish" },
                { value: "fr", label: "French" },
              ]}
            />
          }
        />
        <Row
          label="Higher quality generation"
          description="Use extra compute for sharper, more detailed videos."
          control={
            <Toggle
              label="Higher quality generation"
              checked={higherQuality}
              onChange={setHigherQuality}
            />
          }
        />
      </div>
    </div>
  );
}
