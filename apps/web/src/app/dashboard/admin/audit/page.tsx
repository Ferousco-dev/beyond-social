import { type Metadata } from "next";
import Link from "next/link";
import { type Route } from "next";

import { getAuditActions, getAuditLog } from "@/lib/dashboard/admin";
import { AuditEntryRow } from "@/features/admin/components/audit-entry-row";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Admin · Audit log" };

function actionHref(action: string | undefined): Route {
  return (action ? `/dashboard/admin/audit?action=${encodeURIComponent(action)}` : "/dashboard/admin/audit") as Route;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  const [entries, actions] = await Promise.all([
    getAuditLog({ action, limit: 100 }),
    getAuditActions(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Audit log</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every privileged action, newest first. This console writes here too.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link
          href={actionHref(undefined)}
          aria-current={!action ? "page" : undefined}
          className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium ${
            !action ? "border-transparent bg-ink text-canvas" : "border-hairline text-ink-soft hover:bg-cloud"
          }`}
        >
          All actions
        </Link>
        {actions.map((item) => (
          <Link
            key={item}
            href={actionHref(item)}
            aria-current={action === item ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-full border px-3 font-mono text-xs font-medium ${
              action === item
                ? "border-transparent bg-ink text-canvas"
                : "border-hairline text-ink-soft hover:bg-cloud"
            }`}
          >
            {item}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {entries.length === 0 ? (
          <EmptyState title="No matching entries" body="Nothing has been logged for this filter yet." />
        ) : (
          <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {entries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
