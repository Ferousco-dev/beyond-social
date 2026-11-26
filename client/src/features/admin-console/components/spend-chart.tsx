"use client";

import { useState, type ReactNode } from "react";

import { type SpendDay } from "./spend-days";


const HEIGHT = 180;

const AXIS = 44;

function dollars(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: amount < 10 ? 2 : 0 }).format(amount);
}

function day(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** A round top for the scale, so the gridlines land on even amounts. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

/**
 * Estimated provider cost per day: one bar a day in the brand blue, a faint
 * grid, and the exact figure on hover. Days with nothing are drawn empty
 * rather than skipped, so the gaps show.
 */
export function SpendChart({ days, height = HEIGHT }: { days: readonly SpendDay[]; height?: number }): ReactNode {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...days.map((item) => item.cost), 0));
  const grid = [0, 0.5, 1].map((share) => share * max);
  const slot = 100 / Math.max(days.length, 1);
  const labelEvery = Math.ceil(days.length / 6);
  const shown = hover === null ? null : days[hover];

  return (
    <div className="relative">
      <div className="relative" style={{ height, marginLeft: AXIS }} onMouseLeave={() => setHover(null)}>
        {grid.map((value) => (
          <div key={value} className="absolute inset-x-0 border-t border-hairline" style={{ bottom: `${(value / max) * 100}%` }}>
            <span className="absolute -translate-y-1/2 text-[11px] tabular-nums text-ink-soft" style={{ right: "100%", marginRight: 8 }}>
              {dollars(value)}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end">
          {days.map((item, index) => (
            <button
              key={item.date}
              type="button"
              aria-label={`${day(item.date)}: ${dollars(item.cost)}`}
              onMouseEnter={() => setHover(index)}
              onFocus={() => setHover(index)}
              className="relative flex h-full cursor-default items-end justify-center focus-visible:outline-none"
              style={{ width: `${slot}%`, paddingInline: 1 }}
            >
              <span
                className="block w-full max-w-6 rounded-t-[4px] transition-opacity"
                style={{
                  height: item.cost > 0 ? `max(2px, ${(item.cost / max) * 100}%)` : 0,
                  background: "var(--primary)",
                  opacity: hover === null || hover === index ? 1 : 0.45,
                }}
              />
            </button>
          ))}
        </div>
        {shown && hover !== null ? (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-hairline bg-paper px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(hover + 0.5) * slot}%` }}
          >
            <span className="block text-ink-soft">{day(shown.date)}</span>
            <span className="block font-medium tabular-nums text-ink">{dollars(shown.cost)}</span>
          </div>
        ) : null}
      </div>
      <div className="relative mt-2 h-4" style={{ marginLeft: AXIS }}>
        {days.map((item, index) =>
          index % labelEvery === 0 ? (
            <span key={item.date} className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-ink-soft" style={{ left: `${(index + 0.5) * slot}%` }}>
              {day(item.date)}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
