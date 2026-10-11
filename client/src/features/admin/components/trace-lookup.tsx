"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type TraceTimeline } from "@/lib/dashboard/admin";
import { lookupTrace } from "../actions/debug-reads";

/** Trace search box. Deep-linkable: Health board items link here with a
 * pre-filled trace id that runs automatically on load. */
export function TraceLookup({ initialTraceId }: { readonly initialTraceId?: string }) {
  const [traceId, setTraceId] = useState(initialTraceId ?? "");
  const [result, setResult] = useState<TraceTimeline | null>(null);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function runLookup(id: string) {
    if (!id.trim()) return;
    startTransition(() => {
      void lookupTrace(id.trim()).then((timeline) => {
        setResult(timeline);
        setSearched(true);
      });
    });
  }

  useEffect(() => {
    if (initialTraceId) runLookup(initialTraceId);
  }, [initialTraceId]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    runLookup(traceId);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={traceId}
          onChange={(event) => setTraceId(event.target.value)}
          placeholder="Trace id"
          aria-label="Trace id"
          className="max-w-xs font-mono text-xs"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Searching…" : "Look up"}
        </Button>
      </form>

      {searched && (!result || result.items.length === 0) && (
        <p className="mt-3 text-sm text-ink-soft">No records carry that trace id.</p>
      )}

      {result && result.items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {result.items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="rounded-lg bg-cloud px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink">
                  {item.kind} · {item.detail} · {item.status}
                </span>
                <span className="text-ink-soft">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              {item.error && <p className="mt-1 text-destructive">{item.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
