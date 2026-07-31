"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";

import { StatePanel, type StateAction } from "@/components/ui/empty-state";
import { errorCopy, type ErrorCode, type ErrorReference } from "@/lib/errors";

/**
 * The error half of the shared state shape. Same three questions as
 * `EmptyState`, plus the support reference, because the difference between a
 * report we can look up and one we cannot is a single id.
 */

export interface ErrorStateProps {
  readonly title: string;
  /** What it cost the user. Stated even when the answer is "nothing". */
  readonly impact: ReactNode;
  /** The one thing to do next. */
  readonly action?: StateAction;
  readonly secondary?: StateAction;
  readonly reference?: ErrorReference | null;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly className?: string;
}

export function ErrorState({
  title,
  impact,
  action,
  secondary,
  reference,
  icon = TriangleAlert,
  className,
}: ErrorStateProps) {
  return (
    <StatePanel
      tone="error"
      icon={icon}
      title={title}
      body={impact}
      action={action}
      secondary={secondary}
      footer={reference ? <ReferenceChip reference={reference} /> : undefined}
      className={className}
    />
  );
}

/** Builds the panel straight from a code, so a known failure needs no prose. */
export function CodedErrorState({
  code,
  action,
  secondary,
  reference,
  className,
}: {
  readonly code: ErrorCode;
  readonly action?: StateAction;
  readonly secondary?: StateAction;
  readonly reference?: ErrorReference | null;
  readonly className?: string;
}) {
  const copy = errorCopy(code);
  return (
    <ErrorState
      title={copy.title}
      impact={`${copy.impact} ${copy.action}`}
      action={action}
      secondary={secondary}
      reference={reference}
      className={className}
    />
  );
}

/**
 * The id, and a way to take it without transcribing it. People do get this
 * wrong by hand, and a mistyped reference finds nothing while looking exactly
 * like one that does.
 */
function ReferenceChip({ reference }: { reference: ErrorReference }) {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(reference.value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Clipboard access can be refused. The id is on screen either way, so
      // there is nothing to recover from and nothing worth interrupting for.
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-ink-soft">
        Quote this if you contact support
        <span className="sr-only">
          . {reference.kind === "trace" ? "Trace" : "Error"} reference {reference.value}
        </span>
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline px-4 font-mono text-xs text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden>{reference.value}</span>
        {copied ? (
          <Check aria-hidden className="size-3.5 text-success" />
        ) : (
          <Copy aria-hidden className="size-3.5 text-ink-soft" />
        )}
        <span className="sr-only">{copied ? "Reference copied" : "Copy reference"}</span>
      </button>
    </div>
  );
}
