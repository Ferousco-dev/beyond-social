import { cn } from "@/lib/utils";

const SIZE = 22;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Onboarding progress as a ring rather than a bar.
 *
 * The collapsed panel is a pill, and a bar inside a pill reads as a second
 * control. A ring carries the same fraction in a shape that sits beside a label
 * without asking to be clicked.
 */
export function ProgressRing({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const fraction = max === 0 ? 0 : value / max;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("size-[22px] shrink-0 -rotate-90", className)}
      aria-hidden
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        className="stroke-cloud"
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
        className="stroke-primary transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
      />
    </svg>
  );
}
