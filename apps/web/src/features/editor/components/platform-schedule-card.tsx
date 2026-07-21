"use client";

import { type ReactNode } from "react";

import { RECOMMENDED_TIMES, type Platform } from "@/lib/publish/data";
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
  const times = RECOMMENDED_TIMES[platform.id] ?? [];
  const reason = times.find((time) => time.time === value.scheduledTime)?.reason;

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
              <option key={time.time} value={time.time}>
                {time.time} · {time.label}
              </option>
            ))}
          </select>
          {reason ? <p className="mt-1 text-xs text-ink-soft">{reason}</p> : null}
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
