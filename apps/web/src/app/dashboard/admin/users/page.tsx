import { type Metadata } from "next";
import Link from "next/link";

import { UserSearch } from "@/features/admin/components/user-search";
import { DeletedAccountsPanel } from "@/features/admin/components/deleted-accounts-panel";
import { getDeletedAccounts, searchUsers } from "@/lib/dashboard/admin";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showDeleted = tab === "deleted";

  const [initial, deleted] = await Promise.all([
    searchUsers("", null),
    showDeleted ? getDeletedAccounts() : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Users</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Search accounts and manage credits, plan and access.
      </p>

      <div className="mt-6 flex gap-1.5 border-b border-hairline">
        <Link
          href="/dashboard/admin/users"
          aria-current={!showDeleted ? "page" : undefined}
          className={`min-h-11 border-b-2 px-3 text-sm font-medium ${
            !showDeleted ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          All users
        </Link>
        <Link
          href="/dashboard/admin/users?tab=deleted"
          aria-current={showDeleted ? "page" : undefined}
          className={`min-h-11 border-b-2 px-3 text-sm font-medium ${
            showDeleted ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Deleted accounts
        </Link>
      </div>

      <div className="mt-6">
        {showDeleted ? (
          <DeletedAccountsPanel accounts={deleted} />
        ) : (
          <UserSearch initialUsers={initial.users} initialCursor={initial.nextCursor} />
        )}
      </div>
    </div>
  );
}
