"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { approveWorkflow, cancelWorkflow, getWorkflow, startWorkflow } from "@/features/workflows/actions";
import { useWorkflowSocket } from "@/features/workflows/hooks/use-workflow-socket";
import { WorkflowPhaseView, type PanelPhase } from "@/features/workflows/components/workflow-phase-view";
import type { GoWorkflow } from "@/lib/go-api/schemas";

const RUNNING = new Set(["approved", "running"]);
const FINISHED = new Set(["completed", "failed", "cancelled"]);

function phaseFor(workflow: GoWorkflow): PanelPhase {
  if (FINISHED.has(workflow.status)) return { name: "done", workflow };
  if (RUNNING.has(workflow.status)) return { name: "active", workflow };
  return { name: "preview", workflow };
}

/** The plan an assistant message proposed, with approval and live progress. */
export function WorkflowCard({ workflowId }: { readonly workflowId: string }): ReactNode {
  const [phase, setPhase] = useState<PanelPhase>({ name: "planning" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await getWorkflow(workflowId);
    if (result.status === "ok") setPhase(phaseFor(result.workflow));
    else if (result.status === "error") setError(result.message);
  }, [workflowId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useWorkflowSocket({
    workflowId,
    active: phase.name === "active",
    onUpdate: () => void refresh(),
    onConnection: () => {},
  });

  async function approve(): Promise<void> {
    if (phase.name !== "preview" || busy) return;
    setBusy(true);
    setError(null);
    const approved = await approveWorkflow(phase.workflow.id, phase.workflow.plan_hash);
    if (approved.status !== "ok") {
      setBusy(false);
      setError(approved.status === "error" ? approved.message : "The backend is not connected yet.");
      return;
    }
    // Start at once rather than waiting for the engine to pick it up.
    const started = await startWorkflow(phase.workflow.id);
    setBusy(false);
    setPhase(phaseFor(started.status === "ok" ? started.workflow : approved.workflow));
  }

  async function cancel(): Promise<void> {
    if (phase.name === "idle" || phase.name === "planning" || busy) return;
    setBusy(true);
    const result = await cancelWorkflow(phase.workflow.id);
    setBusy(false);
    if (result.status === "ok") setPhase(phaseFor(result.workflow));
    else setError(result.status === "error" ? result.message : "The backend is not connected yet.");
  }

  if (phase.name === "planning") {
    return <p className="mt-3 text-xs text-ink-soft">Loading the plan…</p>;
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-hairline bg-canvas p-3">
      <WorkflowPhaseView
        phase={phase}
        busy={busy}
        error={error}
        onApprove={() => void approve()}
        onCancel={() => void cancel()}
      />
    </div>
  );
}
