"use client";

import { type MouseEvent, useRef, useState } from "react";

import { TrendChartTooltip } from "./trend-chart-tooltip";

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

const COLORS = {
  primary: "var(--color-primary)",
  destructive: "var(--color-destructive)",
  success: "var(--color-success)",
  "ink-soft": "var(--color-ink-soft)",
} as const;

export interface TrendSeries {
  readonly label: string;
  readonly color: keyof typeof COLORS;
  readonly points: ReadonlyArray<{ day: string; value: number }>;
  /** Filled area under the line. Only makes sense for one series at a time. */
  readonly fill?: boolean;
}

function shortDate(day: string): string {
  const parsed = new Date(day);
  return Number.isNaN(parsed.getTime())
    ? day
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * A real scaled chart, in place of a row of unlabelled CSS bars. No charting
 * dependency, per this repo's own rule against adding one for this: plain
 * SVG, drawn to an actual scale with a y-axis, gridlines, and start/end date
 * labels, so a reader can tell what a line means without hovering every
 * point. Every series shares one scale, so more than one can be compared on
 * the same chart (e.g. DAU against MAU) rather than needing a chart each.
 *
 * Client component: the whole point of this chart is the cursor-following
 * crosshair and tooltip below, which need onMouseMove.
 */
export function TrendChart({
  series,
  formatValue,
}: {
  readonly series: ReadonlyArray<TrendSeries>;
  readonly formatValue?: (value: number) => string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const max = Math.max(1, ...allValues);
  const days = series[0]?.points.map((p) => p.day) ?? [];
  const format = formatValue ?? ((v: number) => v.toLocaleString());

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  function xFor(index: number, total: number): number {
    return total <= 1 ? PAD_LEFT : PAD_LEFT + (index / (total - 1)) * plotWidth;
  }
  function yFor(value: number): number {
    return PAD_TOP + plotHeight - (value / max) * plotHeight;
  }

  function handleMouseMove(event: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || days.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const localX = (event.clientX - rect.left) * scaleX;
    const ratio = days.length <= 1 ? 0 : (localX - PAD_LEFT) / plotWidth;
    const index = Math.round(ratio * (days.length - 1));
    setHoverIndex(Math.min(days.length - 1, Math.max(0, index)));
  }

  const gridLines = [0, 0.5, 1];

  if (days.length === 0) {
    return <p className="py-8 text-center text-xs text-ink-soft">No data in this window.</p>;
  }

  const hoverX = hoverIndex !== null ? xFor(hoverIndex, days.length) : null;

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span
                className="size-2 rounded-full"
                style={{ background: COLORS[s.color] }}
                aria-hidden
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${series.map((s) => s.label).join(" and ")} over the selected window, reaching up to ${format(max)}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((fraction) => {
          const y = PAD_TOP + plotHeight * fraction;
          const value = max * (1 - fraction);
          return (
            <g key={fraction}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-hairline)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="var(--color-ink-soft)"
              >
                {format(value)}
              </text>
            </g>
          );
        })}

        {series.map((s) => {
          const pathPoints = s.points.map((p, i) => [xFor(i, s.points.length), yFor(p.value)]);
          const linePath = pathPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
          const areaPath = s.fill
            ? `${linePath} L${pathPoints[pathPoints.length - 1]![0]},${PAD_TOP + plotHeight} L${pathPoints[0]![0]},${PAD_TOP + plotHeight} Z`
            : null;

          return (
            <g key={s.label}>
              {areaPath && <path d={areaPath} fill={COLORS[s.color]} opacity={0.12} />}
              <path
                d={linePath}
                fill="none"
                stroke={COLORS[s.color]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pathPoints.map(([x, y], i) => (
                <circle
                  key={s.points[i]!.day}
                  cx={x}
                  cy={y}
                  r={i === hoverIndex ? 4 : i === pathPoints.length - 1 ? 3 : 2}
                  fill={COLORS[s.color]}
                />
              ))}
            </g>
          );
        })}

        {hoverX !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={PAD_TOP}
            y2={PAD_TOP + plotHeight}
            stroke="var(--color-ink-soft)"
            strokeWidth={1}
            strokeDasharray="3 3"
            pointerEvents="none"
          />
        )}

        <text x={PAD_LEFT} y={HEIGHT - 4} fontSize={10} fill="var(--color-ink-soft)">
          {shortDate(days[0]!)}
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 4} textAnchor="end" fontSize={10} fill="var(--color-ink-soft)">
          {shortDate(days[days.length - 1]!)}
        </text>

        {hoverIndex !== null && hoverX !== null && (
          <TrendChartTooltip
            x={hoverX}
            y={yFor(series[0]?.points[hoverIndex]?.value ?? 0)}
            chartWidth={WIDTH}
            day={shortDate(days[hoverIndex]!)}
            entries={series.map((s) => ({
              label: s.label,
              color: COLORS[s.color],
              value: format(s.points[hoverIndex]?.value ?? 0),
            }))}
          />
        )}
      </svg>
    </div>
  );
}
