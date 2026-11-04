"use client";

import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

import { LengthPicker } from "./length-picker";
import { spokenText, toLength } from "./pacing";
import { VisualLookPicker } from "./visual-look-picker";
import { CONTENT_KINDS, PLATFORMS, RATIOS, type GenerateFormValues } from "./types";

/** Step B: platform, shape, length, and look. */
export function StepFormat({
  values,
  onChange,
}: {
  values: GenerateFormValues;
  onChange: (patch: Partial<GenerateFormValues>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Platform
        <div className="flex rounded-[10px] border border-hairline p-1" role="group" aria-label="Platform">
          {PLATFORMS.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => onChange({ platform })}
              aria-pressed={values.platform === platform}
              className={cn(
                "h-9 flex-1 cursor-pointer rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                values.platform === platform ? "bg-cloud font-medium text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Aspect ratio
          <div className="flex rounded-[10px] border border-hairline p-1" role="group" aria-label="Aspect ratio">
            {RATIOS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => onChange({ aspectRatio: ratio })}
                aria-pressed={values.aspectRatio === ratio}
                className={cn(
                  "h-9 flex-1 cursor-pointer rounded-lg text-xs tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  values.aspectRatio === ratio ? "bg-cloud font-medium text-ink" : "text-ink-soft hover:text-ink",
                )}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Content
          <Select
            aria-label="Content"
            value={values.contentKind}
            onValueChange={(contentKind) => onChange({ contentKind })}
            options={CONTENT_KINDS.map((kind) => ({ value: kind, label: kind }))}
          />
        </div>
      </div>
      <LengthPicker
        value={toLength(values.seconds)}
        onChange={(seconds) => onChange({ seconds })}
        spoken={spokenText(values)}
        contentKind={values.contentKind}
      />
      <VisualLookPicker style={values.visualStyle} environment={values.environment} onChange={onChange} />
    </div>
  );
}
