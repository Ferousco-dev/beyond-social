"use client";

import { useActionState, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { saveConfigAction, type ConfigFormState } from "../actions";
import { formatChangedAt, formatChangedBy } from "../format";
import { type ConfigRow } from "../schemas";
import { formatConfigValue, parseConfigInput } from "../value";
import { Spinner } from "@/components/ui/spinner";

const FIELD =
  "w-full rounded-lg border border-hairline bg-paper px-3 py-2 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * One key, edited in place and saved explicitly.
 *
 * There is no save-on-blur and no debounce: an operator changing a rate limit
 * during an incident should have to mean it, and every save writes an audit
 * row, so an accidental keystroke would become a permanent entry.
 */
export function ConfigField({ row }: { row: ConfigRow }): ReactNode {
  const stored = formatConfigValue(row.value_type, row.value);
  const [draft, setDraft] = useState(stored);
  const [state, formAction, pending] = useActionState<ConfigFormState, FormData>(saveConfigAction, {
    status: "idle",
  });

  const dirty = draft !== stored;
  const local = dirty ? parseConfigInput(row.value_type, draft) : null;
  const localError = local && !local.ok ? local.message : null;
  const errorId = `${row.key}-error`;

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-hairline bg-paper p-4">
      <input type="hidden" name="key" value={row.key} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <label htmlFor={row.key} className="block font-mono text-sm text-ink">
            {row.key}
          </label>
          <p className="max-w-2xl text-sm text-ink-soft">{row.description}</p>
        </div>
        <Badge tone={row.takes_effect === "immediate" ? "success" : "warning"}>
          {row.takes_effect === "immediate" ? "Live" : "Needs redeploy"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-56 flex-1">
          {row.value_type === "boolean" ? (
            <select
              id={row.key}
              name="value"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={FIELD}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : row.value_type === "json" ? (
            <textarea
              id={row.key}
              name="value"
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={localError !== null}
              aria-describedby={localError ? errorId : undefined}
              className={FIELD}
            />
          ) : (
            <input
              id={row.key}
              name="value"
              type="text"
              inputMode={row.value_type === "number" ? "decimal" : "text"}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={localError !== null}
              aria-describedby={localError ? errorId : undefined}
              className={FIELD}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={pending || !dirty || localError !== null}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Spinner className="size-4" /> : null}
          {pending ? "Saving" : "Save"}
        </button>
      </div>

      <ConfigStatus errorId={errorId} localError={localError} row={row} state={state} />
    </form>
  );
}

function ConfigStatus({
  errorId,
  localError,
  row,
  state,
}: {
  errorId: string;
  localError: string | null;
  row: ConfigRow;
  state: ConfigFormState;
}): ReactNode {
  if (localError) {
    return (
      <p id={errorId} role="alert" className="text-sm text-destructive">
        {localError}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.message}
      </p>
    );
  }
  return (
    <p className="text-xs text-ink-soft">
      {state.status === "saved" ? "Saved and recorded in the audit log. " : ""}
      Last changed {formatChangedAt(row.updated_at)} by {formatChangedBy(row.updated_by_email)}.
    </p>
  );
}
