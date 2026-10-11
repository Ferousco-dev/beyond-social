export interface TooltipEntry {
  readonly label: string;
  readonly color: string;
  readonly value: string;
}

const BOX_PADDING = 8;
const ROW_HEIGHT = 14;
const TITLE_HEIGHT = 16;
const BOX_WIDTH = 140;

/**
 * The floating box the crosshair drags along: one line per series at the
 * hovered day. Flips to the left of the crosshair past the chart's midpoint
 * so it never runs off the right edge of the viewBox.
 */
export function TrendChartTooltip({
  x,
  y,
  chartWidth,
  day,
  entries,
}: {
  readonly x: number;
  readonly y: number;
  readonly chartWidth: number;
  readonly day: string;
  readonly entries: readonly TooltipEntry[];
}) {
  const boxHeight = TITLE_HEIGHT + entries.length * ROW_HEIGHT + BOX_PADDING;
  const boxWidth = BOX_WIDTH;
  const flip = x > chartWidth / 2;
  const boxX = flip ? x - boxWidth - 10 : x + 10;
  const boxY = Math.max(0, y - boxHeight / 2);

  return (
    <g pointerEvents="none">
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={8}
        fill="var(--color-paper)"
        stroke="var(--color-hairline)"
        strokeWidth={1}
      />
      <text
        x={boxX + BOX_PADDING}
        y={boxY + BOX_PADDING + 8}
        fontSize={10}
        fontWeight={600}
        fill="var(--color-ink)"
      >
        {day}
      </text>
      {entries.map((entry, i) => (
        <g key={entry.label} transform={`translate(${boxX + BOX_PADDING}, ${boxY + TITLE_HEIGHT + i * ROW_HEIGHT + 8})`}>
          <circle cx={2} cy={-3} r={2.5} fill={entry.color} />
          <text x={10} y={0} fontSize={10} fill="var(--color-ink-soft)">
            {entry.label}: <tspan fill="var(--color-ink)">{entry.value}</tspan>
          </text>
        </g>
      ))}
    </g>
  );
}
