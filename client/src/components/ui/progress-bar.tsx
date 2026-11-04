"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** A determinate progress bar, announced to assistive technology. */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-cloud", className)}
    >
      <span
        className="block h-full rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/**
 * Progress worth showing while a provider renders. Providers often report
 * nothing between "started" and "done", so while running the value eases
 * toward a ceiling over the typical render time; it never claims to finish
 * before the real job does, and real progress always wins when it is higher.
 */
export function useEstimatedProgress(reported: number, running: boolean, typicalSeconds = 150): { value: number; estimated: boolean } {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [running]);

  if (!running) return { value: reported, estimated: false };
  const elapsed = (now - startedAt) / 1_000;
  const eased = 5 + 87 * (1 - Math.exp(-elapsed / typicalSeconds));
  return eased > reported ? { value: eased, estimated: true } : { value: reported, estimated: false };
}
