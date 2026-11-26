"use client";

import { Gauge } from "lucide-react";

import { speedOf } from "../../core/find.ts";
import { setSpeed } from "../../core/ops.ts";
import { type Item } from "../../core/types.ts";
import { useStudio } from "../../store/editor-store";
import { SliderRow } from "./slider-row";

/** One speed control: a slider from a quarter speed to four times. */
export function SpeedField({ item }: { item: Extract<Item, { kind: "video" | "audio" }> }) {
  const speed = speedOf(item);
  return (
    <SliderRow
      label="Speed"
      Icon={Gauge}
      unit="%"
      min={25}
      max={400}
      value={Math.round(speed * 100)}
      onChange={(v) => useStudio.getState().edit((p) => setSpeed(p, item.id, v / 100), `speed:${item.id}`)}
    />
  );
}
