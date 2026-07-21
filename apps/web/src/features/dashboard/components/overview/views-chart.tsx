"use client";

import { useId, useState } from "react";

import {
  VIEWS_LAST_7_DAYS,
  formatCount,
  formatDayLabel,
  type DailyViews,
} from "@/lib/dashboard/analytics";

const WIDTH = 320;
const HEIGHT = 88;
const PAD_Y = 8;

interface Point {
  readonly x: number;
  readonly y: number;
  readonly day: DailyViews;
}

function buildPoints(series: readonly DailyViews[]): readonly Point[] {
  const max = Math.max(...series.map((day) => day.views));
  const min = Math.min(...series.map((day) => day.views));
  const span = max - min || 1;
  const step = series.length > 1 ? WIDTH / (series.length - 1) : 0;

  return series.map((day, index) => ({
    x: index * step,
    y: PAD_Y + (1 - (day.views - min) / span) * (HEIGHT - PAD_Y * 2),
    day,
  }));
}

export function ViewsChart() {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const points = buildPoints(VIEWS_LAST_7_DAYS);

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${line} ${WIDTH},${HEIGHT} 0,${HEIGHT}`;
  const hovered = active === null ? null : points[active];

  return (
    <figure className="relative m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
        role="img"
        aria-label="Views over the last seven days"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {hovered ? (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1="0"
            y2={HEIGHT}
            stroke="var(--ink-soft)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {/* Hit areas are wider than the marks so hovering is forgiving. */}
        {points.map((point, index) => (
          <rect
            key={point.day.date}
            x={point.x - WIDTH / points.length / 2}
            y={0}
            width={WIDTH / points.length}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
      </svg>

      {hovered ? (
        <div
          style={{ left: `${(hovered.x / WIDTH) * 100}%` }}
          className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded-md border border-hairline bg-paper px-2 py-1 text-xs shadow-card"
        >
          <span className="font-medium text-ink">{formatCount(hovered.day.views)}</span>{" "}
          <span className="text-ink-soft">{formatDayLabel(hovered.day.date)}</span>
        </div>
      ) : null}

      <div className="mt-1 flex justify-between text-[10px] text-ink-soft">
        {points.map((point) => (
          <span key={point.day.date}>{formatDayLabel(point.day.date)}</span>
        ))}
      </div>

      {/* The same numbers, reachable without reading the plot. */}
      <figcaption className="sr-only">
        <table>
          <caption>Views over the last seven days</caption>
          <tbody>
            {VIEWS_LAST_7_DAYS.map((day) => (
              <tr key={day.date}>
                <th scope="row">{day.date}</th>
                <td>{day.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
