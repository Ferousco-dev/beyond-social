"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { removeMemory, saveMemory, setMemoryEnabled, type MemoryResult } from "../actions";

interface Props {
  readonly enabled: boolean;
  readonly facts: readonly { readonly id: string; readonly content: string }[];
  readonly limit: number;
}

export function MemoryManager({ enabled, facts, limit }: Props) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<MemoryResult>, onDone?: () => void): void => {
    setError(null);
    start(async () => {
      const result = await action();
      if (result.ok) onDone?.();
      else setError(result.message);
    });
  };

  const add = (event: FormEvent): void => {
    event.preventDefault();
    run(() => saveMemory(draft), () => setDraft(""));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-hairline bg-paper p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Use memory</h2>
          <p className="mt-1 text-sm text-ink-soft">
            The assistant reads what is saved here before it answers, in chat and in the editor. Turn it off and nothing is read or saved. Your list stays.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Use memory"
          disabled={pending}
          onClick={() => run(() => setMemoryEnabled(!enabled))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${enabled ? "bg-primary" : "bg-hairline"}`}
        >
          <span className={`inline-block size-5 rounded-full bg-paper shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div className="rounded-xl border border-hairline bg-paper p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink">What it remembers</h2>
          <span className="text-xs text-ink-soft tabular-nums">
            {facts.length} of {limit}
          </span>
        </div>
        {facts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nothing yet. Tell the assistant to remember something, or add it below.</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {facts.map((fact) => (
              <li key={fact.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-ink">{fact.content}</span>
                <button
                  type="button"
                  aria-label={`Forget: ${fact.content}`}
                  disabled={pending}
                  onClick={() => run(() => removeMemory(fact.id))}
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="mt-4 flex gap-2">
          <label htmlFor="memory-fact" className="sr-only">
            Add something to remember
          </label>
          <input
            id="memory-fact"
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="For example: my audience is Nigerian founders"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink placeholder:text-ink-soft focus-visible:border-primary focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={pending || draft.trim() === "" || facts.length >= limit}
            className="min-h-11 cursor-pointer rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </form>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
