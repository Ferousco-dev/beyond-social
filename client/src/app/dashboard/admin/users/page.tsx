import { Activity, CreditCard, Search, UserPlus, Users } from "lucide-react";
import { type Metadata, type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { AdminHeader, StatTile, StatusPill } from "@/features/admin/components/admin-ui";
import { ADMIN_PAGE_SIZE, Pager, pageNumber, pageOffset } from "@/features/admin/components/pager";
import { UserSuspensionButton } from "@/features/admin-console/components/user-suspension-button";
import { adminUsersResponse, segmentCountsResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Users" };

/** The four groups, each a number tile that also filters the list. */
const SEGMENTS = [
  { key: "all", label: "All users", count: "total", icon: Users },
  { key: "new", label: "New this week", count: "new", icon: UserPlus },
  { key: "paid", label: "Paid", count: "paid", icon: CreditCard },
  { key: "active", label: "Active this month", count: "active", icon: Activity },
] as const;

type Segment = (typeof SEGMENTS)[number]["key"];

const segmentHref = (key: Segment): Route => `/dashboard/admin/users${key === "all" ? "" : `?segment=${key}`}` as Route;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string; q?: string; page?: string }>;
}): Promise<ReactNode> {
  const { segment, q = "", page: rawPage } = await searchParams;
  const page = pageNumber(rawPage);
  const active: Segment = SEGMENTS.some((item) => item.key === segment) ? (segment as Segment) : "all";
  const query = new URLSearchParams({ segment: active === "all" ? "" : active, q, limit: String(ADMIN_PAGE_SIZE), offset: String(pageOffset(page)) });

  const [counts, users] = await Promise.all([
    goApi("/api/v1/admin/users/segments", segmentCountsResponse),
    goApi(`/api/v1/admin/users?${query.toString()}`, adminUsersResponse),
  ]);

  return (
    <div className="space-y-5">
      <AdminHeader title="Users" />

      <nav aria-label="User groups" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {SEGMENTS.map((item) => (
          <StatTile
            key={item.key}
            href={segmentHref(item.key)}
            active={active === item.key}
            icon={item.icon}
            label={item.label}
            value={counts.ok ? counts.data.data[item.count].toLocaleString("en-US") : "-"}
          />
        ))}
      </nav>

      <div className="overflow-hidden rounded-xl border border-hairline bg-paper">
        <form className="relative border-b border-hairline" role="search">
          {active === "all" ? null : <input type="hidden" name="segment" value={active} />}
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or email"
            aria-label="Search users"
            className="h-9 w-full bg-transparent pl-10 pr-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none"
          />
        </form>

        {!users.ok ? (
          <p role="alert" className="px-4 py-6 text-sm text-destructive">
            {users.message}
          </p>
        ) : users.data.data.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-soft">
            {q ? (
              <>
                No one matches &ldquo;{q}&rdquo;.{" "}
                <Link href={segmentHref(active)} className="font-medium text-primary hover:underline">
                  Clear search
                </Link>
              </>
            ) : (
              "No one in this group yet."
            )}
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {users.data.data.map((user) => (
              <li key={user.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/dashboard/admin/users/${user.id}` as Route} className="group flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={user.name} email={user.email} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink group-hover:text-primary">{user.name || user.email}</span>
                    <span className="block truncate text-xs text-ink-soft">{user.email}</span>
                  </span>
                </Link>
                <span className="hidden sm:block">
                  <StatusPill ok={!user.suspended} label={user.suspended ? "Suspended" : "Active"} />
                </span>
                <span className="hidden w-28 text-right text-sm tabular-nums text-ink md:block">
                  {user.balance.toLocaleString("en-US")}
                  <span className="ml-1 text-xs text-ink-soft">credits</span>
                </span>
                <UserSuspensionButton userId={user.id} suspended={user.suspended} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {users.ok ? <Pager path="/dashboard/admin/users" params={{ segment: active === "all" ? "" : active, q }} page={page} hasMore={users.data.has_more === true} /> : null}
    </div>
  );
}
