"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/use-confirm";
import { type DeletedAccount } from "@/lib/dashboard/admin";
import { restoreAccount } from "../actions/accounts";

export function DeletedAccountsPanel({ accounts }: { readonly accounts: DeletedAccount[] }) {
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();

  if (accounts.length === 0) {
    return (
      <EmptyState title="No deleted accounts" body="Nobody is currently in the deletion grace period." />
    );
  }

  async function handleRestore(account: DeletedAccount) {
    const confirmed = await confirm({
      title: `Restore ${account.email ?? account.userId}?`,
      description: "The account regains full access immediately and leaves the grace period.",
      confirmLabel: "Restore account",
    });
    if (!confirmed) return;

    startTransition(() => {
      void restoreAccount({ userId: account.userId });
    });
  }

  return (
    <div>
      <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
        {accounts.map((account) => (
          <li key={account.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{account.email ?? account.userId}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                Deleted {new Date(account.deletedAt).toLocaleDateString()}
                {account.deletionReason ? ` — ${account.deletionReason}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  account.pastGracePeriod
                    ? "bg-destructive/10 text-destructive"
                    : "bg-cloud text-ink-soft"
                }`}
              >
                {account.pastGracePeriod
                  ? "Past grace period"
                  : `${account.daysRemaining}d left in grace period`}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => void handleRestore(account)}
              >
                Restore
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {dialog}
    </div>
  );
}
