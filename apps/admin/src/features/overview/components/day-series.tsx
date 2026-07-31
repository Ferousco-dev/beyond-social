import { type ReactNode } from "react";

import { formatDay } from "@/lib/format";

export interface SeriesPoint {
  readonly day: string;
  readonly value: number;
}

/**
 * A day-by-day series, drawn as bars and repeated as a table for assistive
 * technology.
 *
 * The bars are decoration over the same rows the table lists, so they carry no
 * information the table lacks and are hidden from the accessibility tree rather
 * than described with a summary that would have to be kept in step by hand.
 * There is no axis and no interpolation: every bar is one row from the query,
 * and an empty day is a zero the database returned, not a gap the client filled.
 */
export function DaySeries({
  label,
  points,
  format,
}: {
  label: string;
  points: readonly SeriesPoint[];
  format: (value: number) => string;
}): ReactNode {
  const peak = points.reduce((highest, point) => Math.max(highest, point.value), 0);

  if (points.length === 0) return null;

  return (
    <figure className="m-0">
      <div aria-hidden className="flex h-16 items-end gap-[3px]">
        {points.map((point) => (
          <span
            key={point.day}
            title={`${formatDay(point.day)}: ${format(point.value)}`}
            className="min-h-px flex-1 rounded-sm bg-primary/30"
            style={{ height: peak === 0 ? "1px" : `${Math.max((point.value / peak) * 100, 1)}%` }}
          />
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-xs text-ink-soft tabular-nums">
        <span>{formatDay(points[0]?.day ?? "")}</span>
        <span>peak {format(peak)}</span>
        <span>{formatDay(points[points.length - 1]?.day ?? "")}</span>
      </figcaption>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{label}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.day}>
              <th scope="row">{point.day}</th>
              <td>{format(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
