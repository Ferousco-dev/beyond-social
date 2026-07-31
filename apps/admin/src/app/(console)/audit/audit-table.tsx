import { ScrollText } from "lucide-react";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

import { type AuditEntry, type AuditPage } from "./query";

/**
 * Newest first, dense, and readable at a glance: when, who, what, and against
 * which target. The before and after payloads stay folded away, since they are
 * only useful once a row has already caught your eye.
 */

const CELL = "px-3 py-2.5 align-top";
const HEAD = "px-3 py-2 text-left text-xs font-medium text-ink-soft";

// Fixed locale and zone so the server rendered markup is stable and two
// operators reading the same row read the same instant.
const TIMESTAMP = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : `${TIMESTAMP.format(parsed)} UTC`;
}

function Payload({ label, value }: { label: string; value: unknown }): ReactNode {
  if (value === null || value === undefined) return null;
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {label}
      </summary>
      <pre className="mt-1 max-w-xs overflow-x-auto rounded-lg bg-cloud p-2 font-mono text-[11px] text-ink">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function Row({ entry }: { entry: AuditEntry }): ReactNode {
  return (
    <tr className="border-t border-hairline">
      <td className={`${CELL} whitespace-nowrap text-ink-soft tabular-nums`}>
        {formatTimestamp(entry.createdAt)}
      </td>
      <td className={`${CELL} text-ink`}>{entry.actorEmail}</td>
      <td className={CELL}>
        <Badge>{entry.action}</Badge>
      </td>
      <td className={`${CELL} text-ink-soft`}>
        <span className="block text-ink">{entry.targetType}</span>
        {entry.targetId ? (
          <span className="block font-mono text-xs break-all">{entry.targetId}</span>
        ) : null}
      </td>
      <td className={`${CELL} text-ink`}>
        {entry.summary ?? <span className="text-ink-soft">No summary</span>}
        <div className="mt-1 flex gap-3">
          <Payload label="Before" value={entry.before} />
          <Payload label="After" value={entry.after} />
        </div>
      </td>
      <td className={`${CELL} font-mono text-xs whitespace-nowrap text-ink-soft`}>
        {entry.ip ?? "unknown"}
      </td>
    </tr>
  );
}

export function AuditTable({ page }: { page: AuditPage | null }): ReactNode {
  if (!page) {
    return (
      <EmptyState
        icon={ScrollText}
        title="The log could not be read"
        description="The query against public.admin_audit_log failed. Nothing is shown, and this is not a report of an empty log."
      />
    );
  }

  if (page.entries.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No matching entries"
        description="No action in the log matches these filters. Clear them to see the full history."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-paper">
      <table className="w-full min-w-3xl border-collapse text-sm">
        <caption className="sr-only">Audit log entries, newest first</caption>
        <thead className="bg-cloud/60">
          <tr>
            <th scope="col" className={HEAD}>
              When
            </th>
            <th scope="col" className={HEAD}>
              Actor
            </th>
            <th scope="col" className={HEAD}>
              Action
            </th>
            <th scope="col" className={HEAD}>
              Target
            </th>
            <th scope="col" className={HEAD}>
              Detail
            </th>
            <th scope="col" className={HEAD}>
              IP
            </th>
          </tr>
        </thead>
        <tbody>
          {page.entries.map((entry) => (
            <Row key={entry.id} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
