import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { formatDate, formatDeletedBy, formatGraceRemaining, formatInstant } from "../format";
import { type DeletedAccount } from "../schema";

import { RestoreDialog } from "./restore-dialog";

/**
 * Deleted accounts, oldest deletion first.
 *
 * Account facts only, exactly as on the accounts page: who it was, when it went,
 * who asked, the reason they gave, and where it stands in the grace period.
 * Nothing the person wrote is read here, and the reason is the one piece of
 * their words that appears, because it was written to the platform about the
 * account rather than inside it.
 */

const CELL = "px-3 py-2.5 align-top";
const HEAD = "px-3 py-2 text-left text-xs font-medium text-ink-soft";

function GraceCell({ account }: { account: DeletedAccount }): ReactNode {
  if (account.pastGracePeriod) {
    return (
      <>
        <Badge tone="danger">Eligible for erasure</Badge>
        <span className="mt-1 block text-xs text-ink-soft">
          Since {formatDate(account.erasableAt)}
        </span>
      </>
    );
  }

  return (
    <>
      <Badge tone="warning">{formatGraceRemaining(account.daysRemaining)}</Badge>
      <span className="mt-1 block text-xs text-ink-soft">
        Until {formatDate(account.erasableAt)}
      </span>
    </>
  );
}

function Row({ account }: { account: DeletedAccount }): ReactNode {
  return (
    <tr className="border-t border-hairline">
      <td className={CELL}>
        <span className="text-ink">{account.email}</span>
        {account.fullName ? (
          <span className="block text-xs text-ink-soft">{account.fullName}</span>
        ) : null}
      </td>
      <td className={`${CELL} whitespace-nowrap text-ink-soft`}>
        {formatInstant(account.deletedAt)}
      </td>
      <td className={`${CELL} text-ink-soft`}>{formatDeletedBy(account.deletedByEmail)}</td>
      <td className={`${CELL} text-ink-soft`}>
        {account.deletionReason ?? <span className="text-ink-soft">No reason given</span>}
      </td>
      <td className={CELL}>
        <GraceCell account={account} />
      </td>
      <td className={`${CELL} text-right`}>
        <RestoreDialog account={account} />
      </td>
    </tr>
  );
}

export function DeletedTable({
  accounts,
  caption,
}: {
  accounts: readonly DeletedAccount[];
  caption: string;
}): ReactNode {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              Account
            </th>
            <th scope="col" className={HEAD}>
              Deleted
            </th>
            <th scope="col" className={HEAD}>
              Requested by
            </th>
            <th scope="col" className={HEAD}>
              Reason
            </th>
            <th scope="col" className={HEAD}>
              Grace period
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <Row key={account.userId} account={account} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
