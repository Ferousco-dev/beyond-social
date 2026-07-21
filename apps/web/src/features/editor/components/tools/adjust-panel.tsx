const ADJUSTMENTS = ["Brightness", "Contrast", "Saturation", "Speed"] as const;

export function AdjustPanel() {
  return (
    <div className="space-y-4">
      {ADJUSTMENTS.map((label) => (
        <label key={label} className="block">
          <span className="text-xs font-medium text-ink">{label}</span>
          <input
            type="range"
            defaultValue={50}
            aria-label={label}
            className="mt-1.5 w-full accent-primary"
          />
        </label>
      ))}
    </div>
  );
}
