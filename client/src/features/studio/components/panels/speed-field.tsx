"use client";

import { cn } from "@/lib/utils";

import { speedOf } from "../../core/find.ts";
import { setSpeed } from "../../core/ops.ts";
import { type Item } from "../../core/types.ts";
import { useStudio } from "../../store/editor-store";
import { Field } from "./field";

const PRESETS = [0.5, 1, 1.5, 2, 3] as const;

export function SpeedField({ item }: { item: Extract<Item, { kind: "video" | "audio" }> }) {
  const speed = speedOf(item);
  const apply = (value: number, key?: string): void => {
    useStudio.getState().edit((p) => setSpeed(p, item.id, value), key);
  };
  return (
    <Field label="Speed" value={`${speed}×`}>
      <div className="space-y-2">
        <div className="flex gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={speed === preset}
              onClick={() => apply(preset)}
              className={cn("flex-1 cursor-pointer rounded-lg border py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary", speed === preset ? "border-primary text-ink" : "border-hairline text-ink-soft hover:text-ink")}
            >
              {preset}×
            </button>
          ))}
        </div>
        <input type="range" min={25} max={400} value={Math.round(speed * 100)} onChange={(e) => apply(Number(e.target.value) / 100, `speed:${item.id}`)} className="w-full accent-primary" aria-label="Speed" />
      </div>
    </Field>
  );
}
