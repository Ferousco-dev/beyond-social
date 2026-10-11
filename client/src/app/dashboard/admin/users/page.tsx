import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { UserSearch } from "@/features/admin/components/user-search";
import { DeletedAccountsPanel } from "@/features/admin/components/deleted-accounts-panel";
import { getDeletedAccounts, searchUsers } from "@/lib/dashboard/admin";

export const metadata: Metadata = { title: "Admin · Users" };

const TABS = [
  { key: "all", label: "All users", href: "/dashboard/admin/users", plan: undefined },
  { key: "creator", label: "Creator", href: "/dashboard/admin/users?tab=creator", plan: "creator" },
  { key: "studio", label: "Studio", href: "/dashboard/admin/users?tab=studio", plan: "studio" },
  { key: "deleted", label: "Deleted accounts", href: "/dashboard/admin/users?tab=deleted", plan: undefined },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

async function UsersSection({ plan }: { plan?: string }) {
  const initial = await searchUsers("", null, 25, plan);
  return <UserSearch key={plan ?? "all"} initialUsers={initial.users} initialCursor={initial.nextCursor} plan={plan} />;
}

async function DeletedAccountsSection() {
  const deleted = await getDeletedAccounts();
  return <DeletedAccountsPanel accounts={deleted} />;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "all";
  const activeConfig = TABS.find((t) => t.key === activeTab)!;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Users</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Search accounts and manage credits, plan and access.
      </p>

      <div className="mt-6 flex gap-1.5 border-b border-hairline">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={activeTab === t.key ? "page" : undefined}
            className={`min-h-11 border-b-2 px-3 text-sm font-medium ${
              activeTab === t.key
                ? "border-ink text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "deleted" ? (
          <Suspense fallback={<ListSkeleton />}>
            <DeletedAccountsSection />
          </Suspense>
        ) : (
          <Suspense key={activeTab} fallback={<ListSkeleton />}>
            <UsersSection plan={activeConfig.plan} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
