"use client";

import { useState, useTransition } from "react";

import { type AdminResult } from "./actions";

/** Runs an admin server action and keeps its pending state and error message. */
export function useAdminAction(): {
  readonly pending: boolean;
  readonly error: string | null;
  readonly run: (action: () => Promise<AdminResult>, onDone?: () => void) => void;
} {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<AdminResult>, onDone?: () => void): void => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onDone?.();
      else setError(result.message);
    });
  };

  return { pending, error, run };
}
