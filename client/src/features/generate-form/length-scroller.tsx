"use client";

import { Chip } from "@/components/ui/choice-chips";

import { PacingNote } from "./length-picker";
import { LENGTHS, LONG_LENGTHS, type Length, type LongLength } from "./pacing";

const OPTIONS: readonly (Length | LongLength)[] = [...LENGTHS, ...LONG_LENGTHS];

const label = (length: number): string => (length >= 60 ? `${length / 60} min` : `${length}s`);

/** Video length as one row of small chips, short to long, that scrolls sideways on a narrow screen. */
export function LengthScroller({
  value,
  onChange,
  spoken,
}: {
  value: Length | LongLength;
  onChange: (length: Length | LongLength) => void;
  spoken: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Video length"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0"
      >
        {OPTIONS.map((length) => (
          <Chip key={length} small selected={value === length} onClick={() => onChange(length)}>
            <span className="tabular-nums">{label(length)}</span>
          </Chip>
        ))}
      </div>
      <PacingNote spoken={spoken} seconds={value} onPick={onChange} />
    </div>
  );
}
