"use client";

import { useMemo } from "react";
import { Select } from "@/components/ui/select";

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
      <Select id={id} value={zone} onValueChange={onChange} options={zones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }))} />
    </div>
  );
}
