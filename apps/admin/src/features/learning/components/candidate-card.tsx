"use client";

import { useActionState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { decideCandidateAction, type ReviewState } from "../actions";
import { type ReviewCandidate } from "../rpc";

/** Scores are 0..1 and read better as whole percentages. */
function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * One candidate, with enough of it visible to decide without opening anything.
 *
 * A reviewer needs the claim itself, what the gate thought of it, and why it is
 * here rather than promoted automatically. The body is the substance of the
 * decision, so it is shown in full rather than truncated: a reviewer approving
 * text they have only seen the first line of is a rubber stamp with extra
 * steps.
 */
export function CandidateCard({ candidate }: { candidate: ReviewCandidate }): ReactNode {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(
    decideCandidateAction,
    { status: "idle" },
  );

  const { draft, evaluation } = candidate;
  const merging = candidate.targetChunkId !== null;

  return (
    <article className="rounded-xl border border-hairline p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-ink">{draft.title ?? draft.id ?? candidate.id}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            {draft.category ?? "uncategorised"}
            {draft.tags.length > 0 ? ` · ${draft.tags.join(", ")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={evaluation.overall >= 0.7 ? "success" : "warning"}>
            {percent(evaluation.overall)} overall
          </Badge>
          <Badge tone="neutral">{percent(evaluation.confidence)} confidence</Badge>
          {merging ? <Badge tone="info">merges into an existing chunk</Badge> : null}
        </div>
      </header>

      <p className="mt-3 text-xs text-ink-soft">
        {evaluation.decision}: {evaluation.decisionReason}
        {evaluation.maxSimilarity !== null
          ? ` Closest existing chunk is ${percent(evaluation.maxSimilarity)} similar.`
          : ""}
      </p>

      <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-cloud p-3 text-xs whitespace-pre-wrap text-ink">
        {draft.body}
      </pre>

      <form action={formAction} className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="candidateId" value={candidate.id} />
        <label className="sr-only" htmlFor={`reason-${candidate.id}`}>
          Reason for rejecting
        </label>
        <input
          id={`reason-${candidate.id}`}
          name="reason"
          placeholder="Why, if rejecting"
          className="h-9 min-w-0 flex-1 rounded-lg border border-hairline bg-transparent px-3 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <button
          type="submit"
          name="action"
          value="promote"
          disabled={pending}
          className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-primary px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Working" : "Promote"}
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          disabled={pending}
          className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-hairline px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>

        {state.status === "error" ? (
          <p role="alert" className="w-full text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
        {state.status === "done" ? (
          <p role="status" className="w-full text-sm text-ink-soft">
            Decided. It will drop out of this list on the next load.
          </p>
        ) : null}
      </form>
    </article>
  );
}
