"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { setPreferredModel } from "../actions";

const ACTION =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors pointer-coarse:min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

/**
 * Sets the model as the default for its family.
 *
 * The chosen state is a plain label rather than a disabled button: there is
 * nothing to press, and a greyed-out control reads as broken instead of as
 * done.
 */
export function SelectModelButton({
  modelId,
  familyLabel,
  isPreferred,
}: {
  modelId: string;
  familyLabel: string;
  isPreferred: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isPreferred) {
    return (
      <span className={cn(ACTION, "bg-cloud text-ink")}>
        <Check className="size-3.5" aria-hidden />
        Your default
      </span>
    );
  }

  const choose = () => {
    setError(null);
    startTransition(async () => {
      const result = await setPreferredModel({ modelId });
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <span className="flex items-center gap-2">
      {error !== null ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={choose}
        disabled={pending}
        className={cn(ACTION, "bg-ink text-paper hover:opacity-90")}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        Make default
        <span className="sr-only"> for {familyLabel.toLowerCase()}</span>
      </button>
    </span>
  );
}
