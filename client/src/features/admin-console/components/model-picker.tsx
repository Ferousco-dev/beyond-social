"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ModelOption } from "@/lib/go-api/admin-schemas";

import { chooseModel } from "../actions";
import { useAdminAction } from "../use-admin-action";

const SHOWN = 40;
const GEMINI = "gemini";
const PREFIX = "openrouter:";

const dollars = (n: number): string => (n === 0 ? "free" : `$${n < 1 ? n.toFixed(2) : n.toFixed(1)}`);

export function ModelPicker({ role, catalog }: { readonly role: { key: string; label: string; model: string }; readonly catalog: readonly ModelOption[] }): ReactNode {
  const [choice, setChoice] = useState(role.model);
  const [filter, setFilter] = useState("");
  const { pending, error, run } = useAdminAction();

  const matches = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return catalog.filter((m) => !needle || m.id.toLowerCase().includes(needle) || m.name.toLowerCase().includes(needle)).slice(0, SHOWN);
  }, [catalog, filter]);
  const picked = choice.startsWith(PREFIX) ? catalog.find((m) => m.id === choice.slice(PREFIX.length)) : undefined;

  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink">{role.label}</p>
        <p className="text-xs text-ink-soft">{role.model === GEMINI ? "Using Gemini" : `Using ${role.model.slice(PREFIX.length)}`}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant={choice === GEMINI ? "default" : "outline"} size="sm" onClick={() => setChoice(GEMINI)}>
          Gemini (default)
        </Button>
        {picked ? (
          <Button size="sm" variant="default" disabled>
            {picked.name}
          </Button>
        ) : null}
      </div>
      {catalog.length > 0 ? (
        <>
          <Input aria-label={`Search OpenRouter models for ${role.label}`} placeholder="Search OpenRouter models" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <ul className="max-h-56 overflow-y-auto rounded-lg border border-hairline" aria-label="OpenRouter models">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={choice === `${PREFIX}${m.id}`}
                  onClick={() => setChoice(`${PREFIX}${m.id}`)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary aria-pressed:bg-cloud"
                >
                  <span className="min-w-0 truncate text-ink">{m.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-soft">
                    {dollars(m.input_per_million)} in · {dollars(m.output_per_million)} out per M
                  </span>
                </button>
              </li>
            ))}
            {matches.length === 0 ? <li className="px-3 py-2 text-sm text-ink-soft">No model matches.</li> : null}
          </ul>
        </>
      ) : null}
      <Button size="sm" disabled={pending || choice === role.model} onClick={() => run(() => chooseModel(role.key, choice))}>
        Save
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
