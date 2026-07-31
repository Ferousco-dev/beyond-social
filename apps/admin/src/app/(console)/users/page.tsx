import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { UserPagination } from "@/features/users/components/user-pagination";
import { UserSearch } from "@/features/users/components/user-search";
import { UsersTable } from "@/features/users/components/users-table";
import { fetchUserPage } from "@/features/users/read";
import { userQuerySchema, type UserQuery } from "@/features/users/schema";

export const metadata: Metadata = { title: "Users" };

/** Accounts change constantly, and a cached list is one that lies during a support call. */
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Account lookup.
 *
 * The search and the cursor live in the query string and are parsed here, at
 * the boundary, so everything below works with a validated shape. The read runs
 * through `admin_search_users`, which checks `is_admin()` in the database
 * before it returns a row.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<ReactNode> {
  const params = await searchParams;
  const query: UserQuery = userQuerySchema.parse({
    q: first(params.q),
    cursor: first(params.cursor),
  });

  const page = await fetchUserPage(query);

  return (
    <>
      <PageHeader
        title="Users"
        description="Find an account, see how much it has used, and change its plan, its credits or its standing. Never its content."
      />

      <Section
        title="Find an account"
        description="Matches any part of an email address or a name. Both are indexed, so a fragment is as fast as a whole address."
      >
        <UserSearch query={query} />
      </Section>

      <Section title="Accounts" description="Newest signup first.">
        <div className="space-y-4">
          <UsersTable page={page} query={query.q} />
          {page ? <UserPagination page={page} query={query} /> : null}
        </div>
      </Section>
    </>
  );
}
