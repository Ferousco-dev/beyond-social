"use client";

import { Check, Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { type Project } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

import { getExportStatus, requestExport } from "../export-actions";

/**
 * Renders the cut into one file.
 *
 * The editor could save a timeline and nothing could turn it into a video:
 * publishing sent the newest raw generation, so every trim and reorder was
 * dropped without a word. This is the missing half.
 *
 * The job outlives the tab that started it, so this polls rather than waits. A
 * six-clip join takes longer than somebody is willing to watch a spinner, and an
 * export that dies because the page was closed would be worse than none.
 */

/** Slow enough not to hammer the row, fast enough to feel finished when it is. */
const POLL_MS = 3000;

/** A join that has not finished by here is stuck, not slow. */
const GIVE_UP_MS = 10 * 60 * 1000;

type State =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; url: string | null }
  | { kind: "problem"; message: string };

export function ExportButton({
  projectId,
  project,
  disabled,
}: {
  projectId: string;
  /** The live timeline, which may be ahead of the last autosave. */
  project: Project;
  /** True when there is no project to export against. */
  disabled: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  // Polling has to stop when the editor closes, or it keeps running against a
  // row nobody is watching.
  useEffect(() => stop, [stop]);

  const watch = useCallback(
    (renderId: string) => {
      startedAt.current = Date.now();
      stop();

      timer.current = window.setInterval(() => {
        void getExportStatus({ renderId }).then((result) => {
          if (result.status === "ready") {
            stop();
            setState({ kind: "done", url: result.url });
            return;
          }
          if (result.status === "failed") {
            stop();
            setState({ kind: "problem", message: result.message });
            return;
          }
          if (result.status === "unknown" || Date.now() - startedAt.current > GIVE_UP_MS) {
            stop();
            setState({
              kind: "problem",
              // Says what is true rather than guessing: the job may still be
              // running, and claiming it failed would be a second wrong answer.
              message: "Still going after ten minutes. Check the library shortly.",
            });
          }
        });
      }, POLL_MS);
    },
    [stop],
  );

  function start() {
    setState({ kind: "working" });

    void requestExport({ projectId, project }).then((result) => {
      if (result.status === "ok") {
        watch(result.renderId);
        return;
      }
      setState({
        kind: "problem",
        message:
          result.status === "empty"
            ? "Nothing on the timeline has a finished render behind it yet."
            : result.status === "unconfigured"
              ? "Exporting needs the backend connected."
              : result.message,
      });
    });
  }

  if (state.kind === "done") {
    return state.url ? (
      <a
        href={state.url}
        download
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Check className="size-3.5" aria-hidden />
        Download
      </a>
    ) : (
      <span className="text-xs text-ink-soft">Exported. Find it in your library.</span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {state.kind === "problem" ? (
        <span role="status" className="max-w-56 truncate text-xs text-destructive">
          {state.message}
        </span>
      ) : null}

      <button
        type="button"
        onClick={start}
        disabled={disabled || state.kind === "working"}
        title={disabled ? "Send a message in the chat first, so there is a project to export" : ""}
        className={cn(
          "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 text-xs font-medium text-ink transition-colors",
          "hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        {state.kind === "working" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Download className="size-3.5" aria-hidden />
        )}
        {state.kind === "working" ? "Exporting" : "Export"}
      </button>
    </span>
  );
}
