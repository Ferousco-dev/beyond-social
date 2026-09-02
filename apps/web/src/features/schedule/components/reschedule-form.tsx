"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";

import { toLocalInput } from "../lib/instant";
import { Spinner } from "@/components/ui/spinner";

/**
 * Picking a new time for a post that has not gone out.
 *
 * The input is prefilled with the time the post currently holds, expressed in
 * the reader's zone, so "move it an hour later" is an edit rather than a
 * retype. The zone travels with the value to the server, which does the
 * conversion: nothing local is ever stored.
 */
export function RescheduleForm({
  scheduledFor,
  timeZone,
  pending,
  onSubmit,
  onCancel,
}: {
  readonly scheduledFor: string;
  readonly timeZone: string;
  readonly pending: boolean;
  readonly onSubmit: (scheduledLocal: string) => void;
  readonly onCancel: () => void;
}): ReactNode {
  const inputId = useId();
  const [value, setValue] = useState(() => toLocalInput(scheduledFor, timeZone));

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (value !== "") onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-2">
      <div className="min-w-52 flex-1">
        <label htmlFor={inputId} className="block text-xs font-medium text-ink">
          New time ({timeZone})
        </label>
        <input
          id={inputId}
          type="datetime-local"
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
      <button
        type="submit"
        disabled={pending || value === ""}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Spinner className="size-3.5" /> : null}
        Save time
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-lg border border-hairline px-3.5 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
      >
        Keep current time
      </button>
    </form>
  );
}
