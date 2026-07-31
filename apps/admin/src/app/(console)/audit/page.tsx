import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";

import { AuditFilters } from "./audit-filters";
import { AuditPagination } from "./audit-pagination";
import { AuditTable } from "./audit-table";
import { auditQuerySchema, type AuditQuery } from "./query";
import { fetchAuditPage } from "./read";

export const metadata: Metadata = { title: "Audit log" };

/** The log grows with every privileged action, so a cached page is a stale one. */
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * The record of everything this console has done.
 *
 * Filters live in the query string and are parsed here, at the boundary, so the
 * rest of the page works with a validated shape. The read runs as the caller,
 * against a table whose only policy is `select using (is_admin())`.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<ReactNode> {
  const params = await searchParams;
  const query: AuditQuery = auditQuerySchema.parse({
    actor: first(params.actor),
    action: first(params.action),
    page: first(params.page) || 1,
  });

  const page = await fetchAuditPage(query);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every privileged action taken in this console: who did it, what changed, and when. Append only, newest first."
      />

      <Section title="Filters" description="Narrow by the administrator who acted or the action.">
        <AuditFilters query={query} />
      </Section>

      <Section title="Entries" description="The log cannot be edited or deleted, by anyone.">
        <div className="space-y-4">
          <AuditTable page={page} />
          {page ? <AuditPagination query={query} total={page.total} /> : null}
        </div>
      </Section>
    </>
  );
}
