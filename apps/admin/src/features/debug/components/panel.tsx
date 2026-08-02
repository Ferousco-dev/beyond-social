import { type ReactNode } from "react";

import { Unavailable } from "@/components/ui/card";

interface PanelProps {
  title: string;
  /** What the panel answers, in one line. */
  hint: string;
  /** Null when the signal could not be read, which is never rendered as zero. */
  observedAt: Date | null;
  children: ReactNode;
}

/**
 * One question, one answer, one timestamp.
 *
 * The timestamp comes from the database clock rather than the browser, and it
 * is rendered in UTC so that an operator comparing this against a worker log is
 * comparing like with like.
 */
export function Panel({ title, hint, observedAt, children }: PanelProps): ReactNode {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-xl border border-hairline bg-paper"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline px-5 py-4">
        <div>
          <h2 id={`${id}-heading`} className="text-sm font-medium text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>
        </div>
        {observedAt ? (
          <p className="text-xs tabular-nums text-ink-soft">
            as of{" "}
            <time dateTime={observedAt.toISOString()}>
              {observedAt.toISOString().replace("T", " ").slice(0, 19)} UTC
            </time>
          </p>
        ) : null}
      </header>
      <div className="px-5 py-4">{observedAt ? children : <Unavailable what={title} />}</div>
    </section>
  );
}

export function PanelEmpty({ children }: { children: ReactNode }): ReactNode {
  return <p className="text-sm text-ink-soft">{children}</p>;
}

/** A record id. Long, meaningless to read, and the thing you paste elsewhere. */
export function RecordId({ value }: { value: string }): ReactNode {
  return (
    <code className="font-mono text-xs break-all text-ink-soft" title={value}>
      {value}
    </code>
  );
}

/**
 * A provider's error, in full and unedited. Wrapped rather than truncated: a
 * stack trace cut at 200 characters is the part that never says why.
 */
export function ErrorText({ children }: { children: string }): ReactNode {
  if (children === "") return <span className="text-ink-soft">no message recorded</span>;
  return (
    <pre className="max-h-40 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-ink">
      {children}
    </pre>
  );
}
