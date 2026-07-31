import { formatDayLabel } from "../lib/format";
import { type UsageDay } from "../lib/types";

const WIDTH = 720;
const HEIGHT = 180;
const GAP_RATIO = 0.25;

/** Nice round ceiling, so the top gridline is a number a person would choose. */
function axisMax(peak: number): number {
  if (peak <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  return Math.ceil(peak / magnitude) * magnitude;
}

/**
 * Credits spent per day, drawn by hand.
 *
 * SVG rather than a charting library: the shape is a few dozen rectangles, and
 * a dependency for that is a dependency to audit, ship and keep.
 *
 * The drawing is hidden from assistive technology and the same numbers are
 * carried by a real table, which reads better than a chart described in prose.
 */
export function CreditChart({ days }: { days: readonly UsageDay[] }) {
  const peak = Math.max(...days.map((day) => day.netCredits), 0);
  const max = axisMax(peak);
  const slot = WIDTH / days.length;
  const barWidth = Math.max(slot * (1 - GAP_RATIO), 1);
  const ticks = [max, max / 2, 0];

  return (
    <figure className="mt-6 rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
      <figcaption className="flex items-baseline justify-between text-xs text-ink-soft">
        <span>Credits per day</span>
        <span className="tabular-nums">Busiest day: {peak.toLocaleString()} credits</span>
      </figcaption>

      <div className="mt-4 flex gap-3">
        <div
          className="flex flex-col justify-between text-[10px] tabular-nums text-ink-soft"
          aria-hidden
        >
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-40 w-full sm:h-48"
          aria-hidden
          focusable="false"
        >
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={0}
              x2={WIDTH}
              y1={HEIGHT - (tick / max) * HEIGHT}
              y2={HEIGHT - (tick / max) * HEIGHT}
              className="stroke-hairline"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {days.map((day, index) => {
            const height = day.netCredits > 0 ? Math.max((day.netCredits / max) * HEIGHT, 2) : 0;
            if (height === 0) return null;
            return (
              <rect
                key={day.day}
                x={index * slot + (slot - barWidth) / 2}
                y={HEIGHT - height}
                width={barWidth}
                height={height}
                className="fill-primary"
              >
                <title>{`${formatDayLabel(day.day)}: ${day.netCredits} credits over ${day.runs} runs`}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex justify-between pl-6 text-[10px] text-ink-soft" aria-hidden>
        <span>{formatDayLabel(days[0]?.day)}</span>
        <span>{formatDayLabel(days.at(-1)?.day)}</span>
      </div>

      <table className="sr-only">
        <caption>Credits spent per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Credits</th>
            <th scope="col">Runs</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day}>
              <th scope="row">{formatDayLabel(day.day)}</th>
              <td>{day.netCredits}</td>
              <td>{day.runs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
