"use client";

import { useState } from "react";

import { type AuditLogEntry } from "@/lib/dashboard/admin";

/** One audit row, expandable to the before/after snapshot the write recorded. */
export function AuditEntryRow({ entry }: { readonly entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = entry.before !== null || entry.after !== null;

  return (
    <li>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        className={`flex w-full min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-3 text-left ${hasDetail ? "hover:bg-cloud" : ""}`}
      >
        <div className="min-w-0">
          <p className="truncate text-sm text-ink">
            <span className="font-mono text-xs text-ink-soft">{entry.action}</span> — {entry.summary}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {entry.actorEmail} · {entry.targetType}
            {entry.targetId ? `:${entry.targetId}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-xs text-ink-soft">{new Date(entry.createdAt).toLocaleString()}</span>
      </button>
      {open && hasDetail && (
        <div className="grid gap-3 border-t border-hairline bg-cloud px-4 py-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium text-ink-soft">Before</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-paper p-2 text-[11px] text-ink">
              {JSON.stringify(entry.before, null, 2) ?? "null"}
            </pre>
          </div>
          <div>
            <p className="text-[11px] font-medium text-ink-soft">After</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-paper p-2 text-[11px] text-ink">
              {JSON.stringify(entry.after, null, 2) ?? "null"}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}
