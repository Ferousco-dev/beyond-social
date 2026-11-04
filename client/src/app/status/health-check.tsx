"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";

/**
 * A live check of `/api/health`, run from the reader's own browser.
 *
 * This is the only honest thing this page can report today. There is no uptime
 * store and no incident record, so anything about history would be invented. One
 * request, made now, from where you are, is a fact. It says nothing about the
 * last hour, and the copy is careful not to imply that it does, nor to imply a
 * check has happened before one has.
 */

const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("web"),
  timestamp: z.string(),
});

/**
 * `idle` is what the server renders, and it is the state a reader with
 * JavaScript turned off keeps. Starting at `checking` would have claimed a
 * request was in flight on a page where none can be made, which is the exact
 * kind of unearned green tick this page exists to avoid.
 */
type CheckState =
  | { readonly kind: "idle" }
  | { readonly kind: "checking" }
  | { readonly kind: "reachable"; readonly latencyMs: number; readonly at: string }
  | { readonly kind: "unreachable"; readonly detail: string };

const DOT: Readonly<Record<CheckState["kind"], string>> = {
  idle: "bg-ink-soft/40",
  checking: "bg-ink-soft",
  reachable: "bg-primary",
  unreachable: "bg-ink",
};

function label(state: CheckState): string {
  switch (state.kind) {
    case "idle":
      return "This check has not run";
    case "checking":
      return "Checking the web app";
    case "reachable":
      return "The web app answered this check";
    case "unreachable":
      return "This check did not get an answer";
  }
}

function detail(state: CheckState): string {
  switch (state.kind) {
    case "idle":
      return "It runs in your browser, so it needs JavaScript. Nothing has been measured yet.";
    case "checking":
      return "Requesting /api/health.";
    case "reachable":
      return `Responded in ${state.latencyMs} ms, reporting its time as ${state.at}.`;
    case "unreachable":
      return `${state.detail} That can be this service, or the network between you and it.`;
  }
}

export function HealthCheck(): ReactNode {
  const [state, setState] = useState<CheckState>({ kind: "idle" });

  const run = useCallback(async (): Promise<void> => {
    setState({ kind: "checking" });
    const started = performance.now();
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const elapsed = Math.round(performance.now() - started);
      if (!response.ok) {
        setState({ kind: "unreachable", detail: `The check returned ${response.status}.` });
        return;
      }
      const parsed = healthSchema.safeParse(await response.json());
      if (!parsed.success) {
        setState({ kind: "unreachable", detail: "The check returned an unexpected body." });
        return;
      }
      setState({ kind: "reachable", latencyMs: elapsed, at: parsed.data.timestamp });
    } catch {
      setState({ kind: "unreachable", detail: "The request could not be completed." });
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${DOT[state.kind]} ${
              state.kind === "checking" ? "motion-safe:animate-pulse" : ""
            }`}
          />
          <div aria-live="polite">
            <p className="text-sm font-medium text-ink">{label(state)}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{detail(state)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={state.kind === "checking"}
          className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          {state.kind === "idle" ? "Run the check" : "Check again"}
        </button>
      </div>
    </div>
  );
}
