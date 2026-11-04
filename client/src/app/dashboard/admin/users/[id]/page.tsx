import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";
import { z } from "zod";

import { AdjustCreditsForm } from "@/features/admin-console/components/adjust-credits-form";
import { adminUserDetailResponse, userLedgerResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · User" };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }): Promise<ReactNode> {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [accountResult, ledgerResult] = await Promise.all([
    goApi(`/api/v1/admin/users/${id}`, adminUserDetailResponse),
    goApi(`/api/v1/admin/users/${id}/credits`, userLedgerResponse),
  ]);
  if (!accountResult.ok || !ledgerResult.ok) {
    const message = !accountResult.ok ? accountResult.message : !ledgerResult.ok ? ledgerResult.message : "Could not load user details.";
    return <p role="alert" className="text-sm text-destructive">{message}</p>;
  }
  const account = accountResult.data.data;
  const { balance, history } = ledgerResult.data.data;
  const periodEnd = account.currentPeriodEnd
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(account.currentPeriodEnd))
    : "No renewal date recorded";
  const created = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(account.createdAt));

  return (
    <div>
      <Link href="/dashboard/admin/users" className="text-sm text-ink-soft hover:text-ink">
        Back to users
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{account.name || account.email}</h1>
      <p className="mt-1 text-sm text-ink-soft">{account.email}</p>

      <dl className="mt-6 grid gap-x-8 border-y border-hairline sm:grid-cols-2">
        {[
          ["Account status", account.accountStatus],
          ["Phone", account.phone || "Not provided"],
          ["Business", account.businessName || "Not provided"],
          ["Industry", account.industry || "Not provided"],
          ["Role", account.role],
          ["Plan", account.plan],
          ["Subscription", account.subscriptionStatus],
          ["Renewal / expiry", periodEnd],
          ["Member since", created],
          ["Remaining credits", `${account.creditBalance.toLocaleString("en-US")} credits`],
          ["Usage points", `${account.fiveHourPoints} in 5 hours · ${account.weeklyPoints} this week`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-hairline py-3 text-sm last:border-b-0 sm:odd:pr-4">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="text-right font-medium capitalize text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-sm font-semibold text-ink">Credit balance: {balance.toLocaleString("en-US")}</h2>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Add or take back credits</h2>
        <AdjustCreditsForm userId={id} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nothing yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {history.map((row, index) => (
              <li key={`${row.createdAt}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block capitalize text-ink">{row.kind}</span>
                  <span className="block truncate text-xs text-ink-soft">{row.reason}</span>
                </span>
                <span className="tabular-nums text-ink">
                  {row.amount > 0 ? "+" : ""}
                  {row.amount}
                  <span className="ml-2 text-xs text-ink-soft">{row.balanceAfter}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
