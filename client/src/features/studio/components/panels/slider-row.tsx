import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

/**
 * One adjustable value: its name above, then the slider and a number box you
 * can type into. The number is always shown as a plain figure with its unit
 * beside it, so the exact value is readable and editable, not only draggable.
 */
export function SliderRow({
  label,
  Icon,
  unit = "",
  min,
  max,
  step = 1,
  value,
  disabled,
  onChange,
}: {
  label: string;
  Icon?: LucideIcon;
  /** Shown after the figure: "%", "s", "×". */
  unit?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}): ReactNode {
  const clamp = (n: number): number => Math.min(max, Math.max(min, n));
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={disabled ? "opacity-50" : undefined}>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
        {label}
      </p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ background: `linear-gradient(to right, var(--color-primary, #2563eb) ${fill}%, var(--color-hairline, #e5e7eb) ${fill}%)` }}
          className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-primary disabled:cursor-not-allowed [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-hairline"
        />
        <label className="flex h-8 w-[4.5rem] shrink-0 items-center rounded-md bg-cloud px-2 text-xs text-ink">
          <input
            type="number"
            aria-label={`${label} value`}
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next) && event.target.value !== "") onChange(clamp(next));
            }}
            className="w-full min-w-0 bg-transparent text-right font-mono tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit ? <span className="ml-0.5 text-ink-soft">{unit}</span> : null}
        </label>
      </div>
    </div>
  );
}

/** A titled group with a divider above it and an optional reset, like a settings sheet. */
export function Section({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset?: () => void;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="space-y-3.5 border-t border-hairline pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {onReset ? (
          <button type="button" aria-label={`Reset ${title.toLowerCase()}`} title="Reset" onClick={onReset} className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
            <RotateIcon />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RotateIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
