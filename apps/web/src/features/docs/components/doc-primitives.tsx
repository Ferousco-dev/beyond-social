import { type ReactNode } from "react";

/**
 * The two pieces every documentation section is made of.
 *
 * Shared rather than repeated per file: the reference pages are split by
 * subject, and a heading that is a different size on the webhooks page than on
 * the API page is how a set of documents stops reading as one document.
 */

/** One documented topic. Real headings, so the page can be scanned by keyboard and by screen reader. */
export function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="border-t border-hairline pt-8 first:border-0 first:pt-0">
      <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <div className="mt-4 flex flex-col gap-4 text-base leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

export function Code({ children }: { children: string }): ReactNode {
  return (
    <pre className="overflow-x-auto rounded-lg border border-hairline bg-paper p-4 text-[13px] leading-relaxed text-ink-soft">
      <code>{children}</code>
    </pre>
  );
}

/** Inline literal: an endpoint, a field name, a status code. */
export function Term({ children }: { children: ReactNode }): ReactNode {
  return <code className="text-ink">{children}</code>;
}
