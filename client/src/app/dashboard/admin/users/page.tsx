import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { adminUsersResponse, segmentCountsResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Users" };

const TABS = [
  { key: "new", label: "New users", hint: "joined in the last 7 days" },
  { key: "paid", label: "Paid users", hint: "have bought credits" },
  { key: "active", label: "Active users", hint: "used credits in the last 30 days" },
] as const;

type Segment = (typeof TABS)[number]["key"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string; q?: string }>;
}): Promise<ReactNode> {
  const { segment, q = "" } = await searchParams;
  const active: Segment = TABS.some((tab) => tab.key === segment) ? (segment as Segment) : "new";
  const query = new URLSearchParams({ segment: active, q, limit: "50" });

  const [counts, users] = await Promise.all([
    goApi("/api/v1/admin/users/segments", segmentCountsResponse),
    goApi(`/api/v1/admin/users?${query.toString()}`, adminUsersResponse),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Users</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {counts.ok ? `${counts.data.data.total} accounts. ` : ""}Everything runs on credits, so there are
        no plans to manage.
      </p>

      <nav aria-label="User groups" className="mt-6 flex gap-1.5 border-b border-hairline">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/admin/users?segment=${tab.key}`}
            aria-current={active === tab.key ? "page" : undefined}
            className={`min-h-11 border-b-2 px-3 py-2.5 text-sm font-medium ${
              active === tab.key ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
            {counts.ok ? <span className="ml-1.5 tabular-nums text-ink-soft">{counts.data.data[tab.key]}</span> : null}
          </Link>
        ))}
      </nav>

      <form className="mt-4" role="search">
        <input type="hidden" name="segment" value={active} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by email or name"
          aria-label="Search users"
          className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"
        />
      </form>

      {!users.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{users.message}</p>
      ) : users.data.data.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">No users here yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {users.data.data.map((user) => (
            <li key={user.id}>
              <Link
                href={`/dashboard/admin/users/${user.id}`}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-cloud"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{user.name || user.email}</span>
                  <span className="block truncate text-xs text-ink-soft">{user.email}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink">{user.balance} credits</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
