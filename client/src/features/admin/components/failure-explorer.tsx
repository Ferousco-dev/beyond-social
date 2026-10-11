"use client";

import { useEffect, useState, useTransition } from "react";

import { type FailureDetails, type FailureKind } from "@/lib/dashboard/admin";
import { exploreFailures } from "../actions/debug-reads";

const KINDS: ReadonlyArray<{ id: FailureKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "generation", label: "Generation" },
  { id: "publish", label: "Publish" },
  { id: "ai", label: "AI" },
];
const WINDOWS = [1, 24, 72] as const;

export function FailureExplorer() {
  const [kind, setKind] = useState<FailureKind>("all");
  const [hours, setHours] = useState<number>(24);
  const [result, setResult] = useState<FailureDetails | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void exploreFailures(hours, kind).then(setResult);
    });
  }, [kind, hours]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              aria-pressed={kind === k.id}
              className={`min-h-9 rounded-full border px-3 text-xs font-medium ${
                kind === k.id
                  ? "border-transparent bg-ink text-canvas"
                  : "border-hairline text-ink-soft hover:bg-cloud"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setHours(w)}
              aria-pressed={hours === w}
              className={`min-h-9 rounded-full border px-3 text-xs font-medium ${
                hours === w
                  ? "border-transparent bg-ink text-canvas"
                  : "border-hairline text-ink-soft hover:bg-cloud"
              }`}
            >
              {w}h
            </button>
          ))}
        </div>
      </div>

      {pending && <p className="mt-3 text-xs text-ink-soft">Loading…</p>}

      {!pending && result && result.items.length === 0 && (
        <p className="mt-3 text-sm text-ink-soft">No failures match this filter.</p>
      )}

      {!pending && result && result.items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {result.items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="rounded-lg bg-destructive/5 px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink">
                  {item.kind} · {item.detail}
                </span>
                <span className="text-ink-soft">{new Date(item.failedAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-destructive">{item.error}</p>
              {item.correlation && (
                <p className="mt-1 font-mono text-ink-soft">trace: {item.correlation}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
