"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadAuditLogAction } from "../actions/audit-log";
import { AuditEntryRow } from "./audit-entry-row";
import { type AuditLogCursor, type AuditLogEntry } from "@/lib/dashboard/admin";

/** Reverse-chronological audit log with keyset "load more", matching UserSearch's pattern. */
export function AuditLogList({
  initialEntries,
  initialCursor,
  action,
}: {
  readonly initialEntries: AuditLogEntry[];
  readonly initialCursor: AuditLogCursor | null;
  readonly action: string | undefined;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    startTransition(() => {
      void loadAuditLogAction(action, cursor).then((page) => {
        setEntries((prev) => [...prev, ...page.entries]);
        setCursor(page.nextCursor);
      });
    });
  }

  if (entries.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState title="No matching entries" body="Nothing has been logged for this filter yet." />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
        {entries.map((entry) => (
          <AuditEntryRow key={entry.id} entry={entry} />
        ))}
      </ul>

      {cursor && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={loadMore}>
            {pending ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
