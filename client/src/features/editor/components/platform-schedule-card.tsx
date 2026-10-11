"use client";

import { useMemo, type ReactNode } from "react";

import { suggestPostingTimes } from "@/lib/optimization/posting-times";
import { type Platform } from "@/lib/publish/data";
import { cn } from "@/lib/utils";

export interface PlatformScheduleValue {
  caption: string;
  hashtags: string;
  scheduledTime: string;
}

const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PlatformScheduleCard({
  platform,
  value,
  onChange,
}: {
  platform: Platform;
  value: PlatformScheduleValue;
  onChange: (field: keyof PlatformScheduleValue, next: string) => void;
}): ReactNode {
  // Computed on mount rather than at module load, so a dialog left open
  // overnight does not offer yesterday's slots.
  const times = useMemo(() => suggestPostingTimes(platform.id), [platform.id]);
  const reason = times.find((time) => time.value === value.scheduledTime)?.reason;

  return (
    <div className="rounded-xl border border-hairline bg-cloud p-4">
      <div className="flex items-center gap-2">
        <platform.icon className="size-5" style={{ color: platform.color }} />
        <h3 className="text-sm font-semibold">{platform.name}</h3>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor={`time-${platform.id}`}
            className="block text-xs font-medium text-ink-soft"
          >
            Schedule time
          </label>
          <select
            id={`time-${platform.id}`}
            value={value.scheduledTime}
            onChange={(event) => onChange("scheduledTime", event.target.value)}
            className={FIELD_CLASS}
          >
            {times.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </select>
          {reason ? <p className="mt-1 text-xs text-ink-soft">{reason}</p> : null}
          <p className="mt-1 text-xs text-ink-soft">
            Based on general engagement patterns for {platform.name}, not your own audience yet.
          </p>
        </div>

        <div>
          <label
            htmlFor={`caption-${platform.id}`}
            className="block text-xs font-medium text-ink-soft"
          >
            Caption
          </label>
          <textarea
            id={`caption-${platform.id}`}
            value={value.caption}
            onChange={(event) => onChange("caption", event.target.value)}
            rows={3}
            placeholder="Add a caption for this platform"
            className={cn(FIELD_CLASS, "resize-none")}
          />
        </div>

        <div>
          <label
            htmlFor={`hashtags-${platform.id}`}
            className="block text-xs font-medium text-ink-soft"
          >
            Hashtags
          </label>
          <input
            id={`hashtags-${platform.id}`}
            type="text"
            value={value.hashtags}
            onChange={(event) => onChange("hashtags", event.target.value)}
            placeholder="#fashion #trending"
            className={FIELD_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
