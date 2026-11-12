"use client";

import { Gauge } from "lucide-react";

import { cn } from "@/lib/utils";

import { speedOf } from "../../core/find.ts";
import { setSpeed } from "../../core/ops.ts";
import { type Item } from "../../core/types.ts";
import { useStudio } from "../../store/editor-store";
import { SliderRow } from "./slider-row";

const PRESETS = [0.5, 1, 1.5, 2, 3] as const;

export function SpeedField({ item }: { item: Extract<Item, { kind: "video" | "audio" }> }) {
  const speed = speedOf(item);
  const apply = (value: number, key?: string): void => {
    useStudio.getState().edit((p) => setSpeed(p, item.id, value), key);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" role="group" aria-label="Speed presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={speed === preset}
            onClick={() => apply(preset)}
            className={cn("flex-1 cursor-pointer rounded-md border py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary", speed === preset ? "border-primary bg-primary/10 text-ink" : "border-hairline text-ink-soft hover:text-ink")}
          >
            {preset}×
          </button>
        ))}
      </div>
      <SliderRow label="Speed" Icon={Gauge} unit="%" min={25} max={400} value={Math.round(speed * 100)} onChange={(v) => apply(v / 100, `speed:${item.id}`)} />
    </div>
  );
}
