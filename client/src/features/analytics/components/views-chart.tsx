"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DayPoint {
  readonly label: string;
  readonly views: number;
  readonly likes: number;
}

type Metric = "views" | "likes";
const RANGES = [7, 14, 30] as const;

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { left: 40, right: 10, top: 14, bottom: 26 };

const compact = (value: number): string => (value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value));

/** A "nice" top for the axis, so the grid lines land on round numbers. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value / 4) ?? 10;
  return Math.ceil(value / (step * magnitude)) * step * magnitude;
}

function Segmented<T extends string | number>({ value, options, onChange, label, format }: { value: T; options: readonly T[]; onChange: (next: T) => void; label: string; format: (option: T) => string }): ReactNode {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-cloud p-0.5">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn("h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium transition-colors", option === value ? "bg-paper text-ink shadow-sm" : "text-ink-soft hover:text-ink")}
        >
          {format(option)}
        </button>
      ))}
    </div>
  );
}

/** Views or likes per day as an area chart: switchable range, hover for the exact day. Drawn in SVG, no chart library. */
export function ViewsChart({ days }: { days: readonly DayPoint[] }): ReactNode {
  const gradient = useId();
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const [metric, setMetric] = useState<Metric>("views");
  const [hover, setHover] = useState<number | null>(null);

  const shown = days.slice(-range);
  const values = shown.map((day) => day[metric]);
  const top = niceMax(Math.max(1, ...values));
  const x = (index: number): number => PAD.left + (shown.length <= 1 ? 0 : (index / (shown.length - 1)) * (WIDTH - PAD.left - PAD.right));
  const y = (value: number): number => PAD.top + (1 - value / top) * (HEIGHT - PAD.top - PAD.bottom);
  const line = values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const baseline = HEIGHT - PAD.bottom;
  const area = shown.length > 1 ? `${line} L${x(shown.length - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => top * fraction);
  const total = values.reduce((sum, value) => sum + value, 0);
  const active = hover !== null ? shown[hover] : undefined;
  const colour = metric === "views" ? "var(--primary)" : "var(--success)";

  const move = (event: React.PointerEvent<SVGSVGElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * WIDTH;
    const index = Math.round(((px - PAD.left) / (WIDTH - PAD.left - PAD.right)) * (shown.length - 1));
    setHover(Math.min(shown.length - 1, Math.max(0, index)));
  };

  return (
    <figure className="rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-soft">{metric === "views" ? "Views" : "Likes"}, last {range} days</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">{total.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Segmented label="Metric" value={metric} options={["views", "likes"] as const} onChange={setMetric} format={(m) => (m === "views" ? "Views" : "Likes")} />
          <Segmented label="Range" value={range} options={RANGES} onChange={setRange} format={(r) => `${r}d`} />
        </div>
      </div>

      <div className="relative mt-3">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full touch-pan-y" role="img" aria-label={`${metric} per day, ${total.toLocaleString()} in total`} onPointerMove={move} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity="0.28" />
              <stop offset="100%" stopColor={colour} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--hairline)" strokeWidth="1" strokeDasharray={tick === 0 ? undefined : "3 4"} />
              <text x={PAD.left - 8} y={y(tick) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-soft)">
                {compact(Math.round(tick))}
              </text>
            </g>
          ))}
          {area ? <path d={area} fill={`url(#${gradient})`} /> : null}
          <path d={line} fill="none" stroke={colour} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
          {shown.map((day, index) =>
            index % Math.max(1, Math.ceil(shown.length / 7)) === 0 ? (
              <text key={day.label + index} x={x(index)} y={HEIGHT - 7} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">
                {day.label}
              </text>
            ) : null,
          )}
          {hover !== null && active ? (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={baseline} stroke="var(--hairline)" strokeWidth="1" />
              <circle cx={x(hover)} cy={y(active[metric])} r="4.5" fill="var(--paper)" stroke={colour} strokeWidth="2" />
            </g>
          ) : null}
        </svg>
        {hover !== null && active ? (
          <div
            className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-lg border border-hairline bg-paper px-2.5 py-1.5 text-xs shadow-card"
            style={{ left: `${Math.min(88, Math.max(12, (x(hover) / WIDTH) * 100))}%` }}
          >
            <p className="text-ink-soft">{active.label}</p>
            <p className="font-semibold tabular-nums text-ink">{active[metric].toLocaleString()}</p>
          </div>
        ) : null}
      </div>
    </figure>
  );
}

/** Ranked horizontal bars: who is ahead, at a glance. */
export function BarList({ items, unit }: { items: readonly { readonly label: string; readonly value: number; readonly hint?: string }[]; unit: string }): ReactNode {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums text-ink-soft">
              {item.value.toLocaleString()} {unit}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cloud" role="presentation">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
          {item.hint ? <p className="mt-1 text-xs text-ink-soft">{item.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/** One video's view trend, inline. */
export function Sparkline({ points, className }: { points: readonly number[]; className?: string }): ReactNode {
  if (points.length < 2) return null;
  const max = Math.max(1, ...points);
  const width = 96;
  const height = 28;
  const path = points
    .map((value, index) => {
      const px = (index / (points.length - 1)) * width;
      const py = 2 + (1 - value / max) * (height - 4);
      return `${index === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-7 w-24", className)} aria-hidden>
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
