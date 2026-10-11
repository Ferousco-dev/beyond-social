import { type Metadata } from "next";
import Link from "next/link";
import { type Route } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAuditActions, getAuditLog } from "@/lib/dashboard/admin";
import { AuditLogList } from "@/features/admin/components/audit-log-list";

export const metadata: Metadata = { title: "Admin · Audit log" };

function actionHref(action: string | undefined): Route {
  return (
    action
      ? `/dashboard/admin/audit?action=${encodeURIComponent(action)}`
      : "/dashboard/admin/audit"
  ) as Route;
}

function FiltersSkeleton() {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-20 rounded-full" />
      ))}
    </div>
  );
}

function EntriesSkeleton() {
  return (
    <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

async function FiltersSection({ action }: { action: string | undefined }) {
  const actions = await getAuditActions();
  return (
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
  );
}

async function EntriesSection({ action }: { action: string | undefined }) {
  const { entries, nextCursor } = await getAuditLog({ action, limit: 100 });
  return <AuditLogList initialEntries={entries} initialCursor={nextCursor} action={action} />;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Audit log</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every privileged action, newest first. This console writes here too.
      </p>

      <Suspense fallback={<FiltersSkeleton />}>
        <FiltersSection action={action} />
      </Suspense>

      <Suspense fallback={<EntriesSkeleton />}>
        <EntriesSection action={action} />
      </Suspense>
    </div>
  );
}
