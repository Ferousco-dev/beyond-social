"use client";

import Link from "next/link";

import { ChoiceChips } from "@/components/ui/choice-chips";
import { useLibrary } from "@/features/asset-library/use-library";

import { ENVIRONMENT_OPTIONS, STYLE_OPTIONS } from "./options";

/** The look and the setting, from presets and the person's saved environments. */
export function VisualLookPicker({
  style,
  environment,
  onChange,
}: {
  style: string;
  environment: string;
  onChange: (patch: { visualStyle?: string; environment?: string }) => void;
}) {
  const library = useLibrary();
  const saved = library.status === "ready" ? library.assets.filter((asset) => asset.kind === "environment").map((asset) => asset.label) : [];

  const environments = [...saved.map((name) => ({ value: name, label: name })), ...ENVIRONMENT_OPTIONS];

  return (
    <div className="flex flex-col gap-4">
      <ChoiceChips
        label="Visual style"
        options={STYLE_OPTIONS}
        value={style}
        onChange={(visualStyle) => onChange({ visualStyle })}
        customPlaceholder="Describe the look"
      />
      <div className="flex flex-col gap-1.5">
        <ChoiceChips label="Environment" options={environments} value={environment} onChange={(next) => onChange({ environment: next })} />
        <p className="text-xs text-ink-soft">
          {saved.length > 0 ? "Your saved environments are listed first. " : "No saved environments yet. "}
          <Link href="/dashboard/assets" className="text-primary underline underline-offset-2">
            Add one in Assets
          </Link>
        </p>
      </div>
    </div>
  );
}
