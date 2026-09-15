/**
 * One CSS bar chart, no charting dependency: a row of divs scaled to the max
 * value in the series. Good enough for a scan; anything more precise belongs
 * in a real chart library, which this repo has decided not to add yet.
 */
export function BarRow({
  points,
  formatValue,
}: {
  readonly points: ReadonlyArray<{ day: string; value: number }>;
  readonly formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <div className="flex h-24 gap-px" role="img" aria-label="Daily values over the selected window">
      {points.map((point) => (
        <div
          key={point.day}
          className="group flex h-full flex-1 flex-col justify-end"
          title={`${point.day}: ${formatValue ? formatValue(point.value) : point.value}`}
        >
          <div
            className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary"
            style={{ height: `${Math.max(2, (point.value / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
