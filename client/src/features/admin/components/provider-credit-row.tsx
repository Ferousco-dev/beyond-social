"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAppConfig } from "@/features/admin/actions/config";
import { type ProviderCreditAccount } from "@/lib/dashboard/admin/provider-credits";

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function ProviderCreditRow({ account }: { readonly account: ProviderCreditAccount }) {
  const router = useRouter();
  const [credits, setCredits] = useState(account.remainingCredits?.toString() ?? "");
  const [expiresAt, setExpiresAt] = useState(toDateInput(account.expiresAt));
  const [warningDays, setWarningDays] = useState(account.warningDays.toString());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    credits !== (account.remainingCredits?.toString() ?? "") ||
    expiresAt !== toDateInput(account.expiresAt) ||
    warningDays !== account.warningDays.toString();

  function save(): void {
    const parsedCredits = credits === "" ? null : Number(credits);
    const parsedWarning = Number(warningDays);
    if (
      (parsedCredits !== null && (!Number.isFinite(parsedCredits) || parsedCredits < 0)) ||
      !Number.isInteger(parsedWarning) ||
      parsedWarning < 1 ||
      parsedWarning > 365
    ) {
      setError("Enter a non-negative balance and a warning window from 1 to 365 days.");
      return;
    }

    setError(null);
    startTransition(() => {
      void setAppConfig({
        key: account.key,
        value: {
          remainingCredits: parsedCredits,
          expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59.999Z`).toISOString() : null,
          warningDays: parsedWarning,
        },
      }).then((result) => {
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    });
  }

  return (
    <li className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(9rem,1fr)_repeat(3,minmax(8rem,1fr))_auto] lg:items-end">
      <div>
        <p className="text-sm font-medium capitalize text-ink">{account.provider}</p>
        <p className="mt-1 text-xs text-ink-soft">
          {account.daysUntilExpiry === null
            ? "Expiry not recorded"
            : account.daysUntilExpiry < 0
              ? `Expired ${Math.abs(account.daysUntilExpiry)} days ago`
              : `${account.daysUntilExpiry} days remaining`}
        </p>
      </div>
      <label className="text-xs font-medium text-ink-soft">
        Remaining credits
        <Input
          type="number"
          min="0"
          value={credits}
          onChange={(event) => setCredits(event.target.value)}
          placeholder="Unknown"
          className="mt-1.5 h-10"
        />
      </label>
      <label className="text-xs font-medium text-ink-soft">
        Expires
        <Input
          type="date"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          className="mt-1.5 h-10"
        />
      </label>
      <label className="text-xs font-medium text-ink-soft">
        Warn before
        <Input
          type="number"
          min="1"
          max="365"
          value={warningDays}
          onChange={(event) => setWarningDays(event.target.value)}
          className="mt-1.5 h-10"
        />
      </label>
      <Button type="button" size="sm" disabled={!dirty || pending} onClick={save}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive lg:col-span-5">
          {error}
        </p>
      ) : null}
    </li>
  );
}
