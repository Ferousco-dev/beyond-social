export interface DayPoint {
  readonly label: string;
  readonly views: number;
  readonly likes: number;
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 44;
const PAD_BOTTOM = 24;
const PAD_TOP = 12;

/** Views and likes per day, hand-drawn SVG, no chart dependency. */
export function ViewsChart({ days }: { days: readonly DayPoint[] }) {
  const max = Math.max(1, ...days.map((day) => day.views));
  const x = (index: number): number =>
    PAD_LEFT + (days.length <= 1 ? 0 : (index / (days.length - 1)) * (WIDTH - PAD_LEFT - 8));
  const y = (value: number): number => PAD_TOP + (1 - value / max) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
  const line = (pick: (day: DayPoint) => number): string =>
    days.map((day, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(pick(day)).toFixed(1)}`).join(" ");
  const ticks = [0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction));

  return (
    <figure
      role="img"
      aria-label={`Views per day, peaking at ${max.toLocaleString()} views`}
      className="rounded-2xl border border-hairline bg-paper p-4"
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} x2={WIDTH - 8} y1={y(tick)} y2={y(tick)} stroke="var(--hairline)" strokeWidth="1" />
            <text x={PAD_LEFT - 6} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="var(--ink-soft)">
              {tick >= 1000 ? `${(tick / 1000).toFixed(1)}K` : tick}
            </text>
          </g>
        ))}
        <path d={line((day) => day.views)} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
        <path
          d={line((day) => day.likes)}
          fill="none"
          stroke="var(--success)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
        {days.map((day, index) =>
          index % Math.ceil(days.length / 7) === 0 ? (
            <text key={day.label} x={x(index)} y={HEIGHT - 6} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">
              {day.label}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-primary" aria-hidden /> Views
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-success" aria-hidden /> Likes
        </span>
      </figcaption>
    </figure>
  );
}

/** One video's view trend, inline. */
export function Sparkline({ points }: { points: readonly number[] }) {
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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-24" aria-hidden>
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
