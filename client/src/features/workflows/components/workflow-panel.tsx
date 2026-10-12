"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import type { GoWorkflow } from "@/lib/go-api/schemas";

import {
  approveWorkflow,
  cancelWorkflow,
  getWorkflow,
  startWorkflow,
  submitWorkflow,
} from "../actions";
import { useWorkflowSocket } from "../hooks/use-workflow-socket";
import { WorkflowPhaseView, type PanelPhase } from "./workflow-phase-view";

const ACTIVE_STATUSES = new Set(["approved", "running"]);
const DONE_STATUSES = new Set(["completed", "failed", "cancelled"]);

/** Natural-language workflows: describe, preview, approve, follow progress. */
export function WorkflowPanel() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<PanelPhase>({ name: "idle" });
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeId =
    phase.name === "preview" || phase.name === "active" ? phase.workflow.id : null;
  const watching = phase.name === "active";

  const refresh = useCallback(async () => {
    if (!activeId) return;
    const result = await getWorkflow(activeId);
    if (result.status !== "ok") return;
    setPhaseFor(result.workflow);
  }, [activeId]);

  function setPhaseFor(workflow: GoWorkflow): void {
    if (DONE_STATUSES.has(workflow.status)) {
      setPhase({ name: "done", workflow });
    } else if (ACTIVE_STATUSES.has(workflow.status)) {
      setPhase({ name: "active", workflow });
    } else {
      setPhase({ name: "preview", workflow });
    }
  }

  useWorkflowSocket({
    workflowId: watching ? activeId : null,
    active: watching,
    onUpdate: () => void refresh(),
    onConnection: () => {},
  });

  async function plan() {
    const trimmed = objective.trim();
    if (trimmed === "" || busy) return;
    setBusy(true);
    setError(null);
    setPhase({ name: "planning" });
    const result = await submitWorkflow({ objective: trimmed, idempotencyKey: crypto.randomUUID() });
    setBusy(false);
    if (result.status !== "ok") {
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
      setPhase({ name: "idle" });
      return;
    }
    setPhaseFor(result.workflow);
    setOpen(true);
  }

  async function approve() {
    if (phase.name !== "preview" || busy) return;
    setBusy(true);
    setError(null);
    const result = await approveWorkflow(phase.workflow.id, phase.workflow.plan_hash);
    if (result.status !== "ok") {
      setBusy(false);
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
      return;
    }
    // Start at once rather than waiting for the engine tick to claim it.
    const started = await startWorkflow(phase.workflow.id);
    setBusy(false);
    setPhase({ name: "active", workflow: started.status === "ok" ? started.workflow : result.workflow });
  }

  async function cancel() {
    const id = phase.name === "preview" || phase.name === "active" ? phase.workflow.id : null;
    if (!id || busy) return;
    setBusy(true);
    const result = await cancelWorkflow(id);
    setBusy(false);
    if (result.status !== "ok") {
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
      return;
    }
    setPhase({ name: "done", workflow: result.workflow });
  }

  return (
    <section aria-label="AI workflow" className="shrink-0 border-b border-hairline">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-cloud/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Sparkles className="size-4 text-ink-soft" aria-hidden />
        <span className="flex-1 text-sm font-medium text-ink">AI workflow</span>
        {phase.name === "active" ? (
          <span className="size-2 rounded-full bg-info" aria-label="Workflow running" />
        ) : null}
        <ChevronDown className={cn("size-4 text-ink-soft transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div className="space-y-3 px-4 pb-4">
          {phase.name === "idle" || phase.name === "planning" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void plan();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Describe a multi-step task"
                aria-label="Describe a multi-step task"
                disabled={busy}
                className="h-10 min-w-0 flex-1 rounded-full border border-hairline bg-paper px-4 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              />
              <button
                type="submit"
                disabled={busy || objective.trim() === ""}
                className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {phase.name === "planning" ? "Planning…" : "Plan"}
              </button>
            </form>
          ) : null}

          {phase.name === "planning" ? (
            <p className="text-sm text-ink-soft" aria-live="polite">
              Gemini is turning this into steps…
            </p>
          ) : null}

          <WorkflowPhaseView
            phase={phase}
            busy={busy}
            error={error}
            onApprove={() => void approve()}
            onCancel={() => void cancel()}
            onReset={() => {
              setPhase({ name: "idle" });
              setObjective("");
              setError(null);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
