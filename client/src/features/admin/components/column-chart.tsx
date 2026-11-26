"use client";

import { useState, type ReactNode } from "react";

export interface Column {
  readonly label: string;
  readonly value: number;
  /** Failures are drawn in red; everything else in the brand blue. */
  readonly bad?: boolean;
}

const HEIGHT = 150;

/**
 * A count per category as columns: one hue, a faint baseline, the figure above
 * each column and the exact number on hover. Zero is drawn as a thin stub so
 * an empty category is still visible.
 */
export function ColumnChart({ columns }: { columns: readonly Column[] }): ReactNode {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...columns.map((column) => column.value), 1);

  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height: HEIGHT + 40 }} onMouseLeave={() => setHover(null)}>
      {columns.map((column, index) => {
        const share = column.value / max;
        const dim = hover !== null && hover !== index;
        return (
          <div
            key={column.label}
            className="flex min-w-0 flex-1 flex-col items-center"
            onMouseEnter={() => setHover(index)}
            title={`${column.label}: ${column.value.toLocaleString("en-US")}`}
          >
            <span className={`mb-1 text-xs font-medium tabular-nums ${column.bad && column.value > 0 ? "text-destructive" : "text-ink"}`}>
              {column.value.toLocaleString("en-US")}
            </span>
            <div className="flex w-full justify-center border-b border-hairline" style={{ height: HEIGHT }}>
              <div
                className="mt-auto w-full max-w-10 rounded-t-[4px] transition-opacity"
                style={{
                  height: column.value > 0 ? `max(3px, ${share * 100}%)` : 2,
                  background: column.bad ? "var(--destructive)" : "var(--primary)",
                  opacity: column.value === 0 ? 0.25 : dim ? 0.45 : 1,
                }}
              />
            </div>
            <span className="mt-1.5 block h-4 w-full overflow-hidden whitespace-nowrap text-center text-[10px] leading-4 text-ink-soft sm:text-[11px]">{column.label}</span>
          </div>
        );
      })}
    </div>
  );
}
