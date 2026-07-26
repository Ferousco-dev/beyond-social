"use client";

import { useTransition } from "react";

import { setFeatureFlag } from "../actions";

/** Flag switch. The database refuses non-admin writes, so this is UI only. */
export function FlagToggle({ flagKey, enabled }: { flagKey: string; enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${flagKey}`}
      disabled={pending}
      onClick={() =>
        startTransition(() => void setFeatureFlag({ key: flagKey, enabled: !enabled }))
      }
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${
        enabled ? "bg-primary" : "bg-cloud"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-paper transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
