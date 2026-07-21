"use client";

import { cn } from "@/lib/utils";

/**
 * Minimal switch built on a button rather than a new dependency. Uses
 * role="switch" so assistive tech announces the on/off state.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-primary" : "bg-cloud",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-paper shadow-card transition-transform motion-reduce:transition-none",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}
