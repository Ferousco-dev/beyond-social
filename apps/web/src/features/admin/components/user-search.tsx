"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { searchUsersAction } from "../actions/search-users";
import { type AdminUserRow, type UserSearchCursor } from "@/lib/dashboard/admin";

const DEBOUNCE_MS = 300;

export function UserSearch({
  initialUsers,
  initialCursor,
  plan,
}: {
  readonly initialUsers: AdminUserRow[];
  readonly initialCursor: UserSearchCursor | null;
  /** Scope search and load-more to one plan, e.g. the Creator or Studio tab. */
  readonly plan?: string;
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startTransition(() => {
        void searchUsersAction(query, null, plan).then((result) => {
          setUsers(result.users);
          setCursor(result.nextCursor);
        });
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plan changes remount this component via `key` on the page, so it need not retrigger this effect
  }, [query]);

  function loadMore() {
    startTransition(() => {
      void searchUsersAction(query, cursor, plan).then((result) => {
        setUsers((prev) => [...prev, ...result.users]);
        setCursor(result.nextCursor);
      });
    });
  }

  return (
    <div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <Input
          type="search"
          placeholder="Search by email or name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-10"
          aria-label="Search users"
        />
      </label>

      {users.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No accounts match"
            body="Try a different email fragment or name, or clear the search."
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                href={`/dashboard/admin/users/${user.id}`}
                className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 hover:bg-cloud"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {user.fullName ?? user.email ?? user.id}
                  </p>
                  <p className="truncate text-xs text-ink-soft">{user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-ink-soft">
                  {user.suspendedAt && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                      Suspended
                    </span>
                  )}
                  <span className="tabular-nums" title="Credits spent this period, of the allowance">
                    {user.creditsUsed.toLocaleString()} spent / {user.creditsTotal.toLocaleString()}
                  </span>
                  <span>{user.plan ?? "no plan"}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

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
