"use client";

import { useMemo } from "react";

interface Props {
  readonly id: string;
  readonly zone: string;
  readonly onChange: (zone: string) => void;
}

/** Shows which zone a time is in, with a way to change it. Defaults to the browser's. */
export function ZoneField({ id, zone, onChange }: Props) {
  const zones = useMemo(() => {
    const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return all.includes(zone) ? all : [zone, ...all];
  }, [zone]);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-ink-soft">
        Time zone
      </label>
      <select
        id={id}
        value={zone}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none"
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
