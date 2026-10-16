"use client";

import { cn } from "@/lib/utils";

import { CONTENT_KINDS, PLATFORMS, RATIOS, type GenerateFormValues } from "./types";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";

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
      <div className="grid gap-3 sm:grid-cols-3">
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
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Duration (seconds)
          <input
            type="number"
            min={3}
            max={15}
            value={values.seconds}
            onChange={(event) => onChange({ seconds: Math.min(15, Math.max(3, Number(event.target.value) || 3)) })}
            className={fieldClass}
          />
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Content
          <select
            value={values.contentKind}
            onChange={(event) => onChange({ contentKind: event.target.value })}
            className={`${fieldClass} cursor-pointer`}
          >
            {CONTENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Visual style and environment
        <input
          value={values.visualStyle}
          onChange={(event) => onChange({ visualStyle: event.target.value })}
          placeholder="Bright bathroom, fast cuts, morning light"
          className={fieldClass}
        />
      </label>
    </div>
  );
}
