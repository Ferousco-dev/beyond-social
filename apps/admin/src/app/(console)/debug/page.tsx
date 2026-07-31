import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { DebugView } from "@/features/debug/debug-view";
import { debugQuerySchema, type DebugQuery } from "@/features/debug/query";

export const metadata: Metadata = { title: "Debug" };

/** An investigation served from a cache is an investigation of the past. */
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Where a support report becomes one query.
 *
 * The health console says something is wrong; this page says which record, for
 * which account, with which provider error. Its filters live in the query
 * string so a view of one incident can be pasted into a ticket and reopened by
 * whoever picks it up next.
 */
export default async function DebugPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<ReactNode> {
  const params = await searchParams;
  const query: DebugQuery = debugQuerySchema.parse({
    trace: first(params.trace),
    day: first(params.day),
    kind: first(params.kind),
  });

  return (
    <>
      <PageHeader
        title="Debug"
        description="Follow one trace across generations and posts, read the provider's real error, and find work a worker abandoned. Read only, apart from putting a failed post back in front of the scheduler."
      />
      <DebugView query={query} />
    </>
  );
}
