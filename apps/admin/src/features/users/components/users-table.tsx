import { Users } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Unavailable } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCount } from "@/lib/format";

import { formatDate } from "../format";
import { planLabel } from "../plans";
import { type UserPage, type UserRow } from "../schema";

/**
 * The result of a search: who the account is, what it is on, how much of its
 * allowance it has used, and whether it is suspended.
 *
 * There is deliberately no column of content here and none on the detail page.
 * An operator needs to know that an account exists and how much it has used,
 * not to read what someone wrote.
 */

const CELL = "px-3 py-2.5 align-middle";
const HEAD = "px-3 py-2 text-left text-xs font-medium text-ink-soft";

function Row({ user }: { user: UserRow }): ReactNode {
  return (
    <tr className="border-t border-hairline">
      <td className={CELL}>
        <Link
          href={`/users/${user.id}`}
          className="text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {user.email}
        </Link>
        {user.fullName ? (
          <span className="block text-xs text-ink-soft">{user.fullName}</span>
        ) : null}
      </td>
      <td className={CELL}>
        <Badge tone={user.role === "admin" ? "info" : "neutral"}>{planLabel(user.plan)}</Badge>
      </td>
      <td className={`${CELL} text-right text-ink tabular-nums`}>
        {formatCount(user.creditsUsed)} / {formatCount(user.creditsTotal)}
      </td>
      <td className={`${CELL} whitespace-nowrap text-ink-soft`}>{formatDate(user.createdAt)}</td>
      <td className={CELL}>
        {user.suspendedAt ? (
          <Badge tone="danger">Suspended</Badge>
        ) : (
          <Badge tone="success">Active</Badge>
        )}
      </td>
    </tr>
  );
}

export function UsersTable({ page, query }: { page: UserPage | null; query: string }): ReactNode {
  if (!page) return <Unavailable what="The account list" />;

  if (page.rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={query ? "No account matches that" : "No accounts yet"}
        description={
          query
            ? "Search matches any part of an email address or a name. Check the spelling, or clear the search to browse from the newest signup."
            : "Accounts appear here as soon as people sign up."
        }
      />
    );
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[44rem] text-sm">
        <caption className="sr-only">Accounts, newest signup first</caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              Account
            </th>
            <th scope="col" className={HEAD}>
              Plan
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              Credits used
            </th>
            <th scope="col" className={HEAD}>
              Signed up
            </th>
            <th scope="col" className={HEAD}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {page.rows.map((user) => (
            <Row key={user.id} user={user} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
