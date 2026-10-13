import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";
import { z } from "zod";

import { AdjustCreditsForm } from "@/features/admin-console/components/adjust-credits-form";
import { userLedgerResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · User" };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }): Promise<ReactNode> {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const result = await goApi(`/api/v1/admin/users/${id}/credits`, userLedgerResponse);
  if (!result.ok) {
    return <p role="alert" className="text-sm text-destructive">{result.message}</p>;
  }
  const { balance, history } = result.data.data;

  return (
    <div>
      <Link href="/dashboard/admin/users" className="text-sm text-ink-soft hover:text-ink">
        Back to users
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{balance} credits</h1>

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
