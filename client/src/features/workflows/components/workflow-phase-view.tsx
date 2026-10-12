import type { GoWorkflow } from "@/lib/go-api/schemas";

import { StepResultLinks, WorkflowSteps } from "./workflow-steps";

export type PanelPhase =
  | { name: "idle" }
  | { name: "planning" }
  | { name: "preview"; workflow: GoWorkflow }
  | { name: "active"; workflow: GoWorkflow }
  | { name: "done"; workflow: GoWorkflow };

/** Everything under the toggle: form states, preview, progress, results. */
export function WorkflowPhaseView({
  phase,
  busy,
  error,
  onApprove,
  onCancel,
  onReset,
}: {
  phase: PanelPhase;
  busy: boolean;
  error: string | null;
  onApprove: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  const questions =
    phase.name === "preview" && phase.workflow.status === "awaiting_clarification"
      ? planQuestions(phase.workflow.plan)
      : [];

  return (
    <>
      {questions.length > 0 ? (
        <ul className="space-y-1.5">
          {questions.map((question) => (
            <li key={question} className="rounded-xl border border-hairline bg-cloud/50 px-3 py-2 text-sm text-ink">
              {question}
            </li>
          ))}
        </ul>
      ) : null}

      {phase.name === "preview" && questions.length === 0 ? (
        <>
          <p className="text-sm text-ink-soft">{phase.workflow.objective}</p>
          <WorkflowSteps steps={phase.workflow.steps} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Approve and run
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex h-10 cursor-pointer items-center rounded-full border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-40"
            >
              Discard
            </button>
          </div>
        </>
      ) : null}

      {phase.name === "active" ? (
        <>
          <WorkflowSteps steps={phase.workflow.steps} />
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full border border-hairline text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-40"
          >
            Cancel workflow
          </button>
        </>
      ) : null}

      {phase.name === "done" ? (
        <>
          <p className="text-sm text-ink-soft">
            {phase.workflow.status === "completed"
              ? "Workflow finished."
              : phase.workflow.error !== ""
                ? phase.workflow.error
                : `Workflow ${phase.workflow.status}.`}
          </p>
          <StepResultLinks steps={phase.workflow.steps} />
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full border border-hairline text-sm font-medium text-ink transition-colors hover:bg-cloud"
          >
            New workflow
          </button>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}

function planQuestions(plan: Readonly<Record<string, unknown>>): string[] {
  const raw = plan["missing_info"];
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string").slice(0, 5);
}
