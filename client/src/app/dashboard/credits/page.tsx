import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PackCard } from "@/features/billing/pack-card";
import { Receipts } from "@/features/billing/receipts";
import { startSubscription } from "@/features/billing/actions";
import { RedirectButton } from "@/features/billing/redirect-button";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { creditsResponse, packsResponse, paymentsResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Credits" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Readonly<Record<string, string>> = {
  grant: "Welcome credits",
  purchase: "Credits added",
  reserve: "Used",
  settle: "Adjusted",
  refund: "Refunded",
  adjust: "Adjustment",
};

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ paid?: string; cancelled?: string }> }): Promise<ReactNode> {
  const { paid, cancelled } = await searchParams;
  const [user, result, packs, payments] = await Promise.all([
    getCurrentUser(),
    goApi("/api/v1/credits", creditsResponse),
    goApi("/api/v1/packs", packsResponse),
    goApi("/api/v1/credits/payments", paymentsResponse),
  ]);
  if (!result.ok) {
    return (
      <p role="alert" className="mx-auto max-w-2xl px-4 py-10 text-sm text-destructive">
        {result.message}
      </p>
    );
  }
  const { balance, history } = result.data.data;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Credits</h1>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-5xl font-semibold tabular-nums text-ink">{balance}</span>
        <span className="text-sm text-ink-soft">available</span>
      </p>
      <p className="mt-1 text-sm text-ink-soft">Credits are returned if something fails, and they do not expire.</p>
      {paid ? (
        <p role="status" className="mt-4 rounded-lg border border-hairline bg-paper p-3 text-sm text-ink">
          Thank you. Your credits are added as soon as the payment is confirmed, which is usually a few seconds. Refresh if the balance has not moved.
        </p>
      ) : null}
      {cancelled ? <p className="mt-4 text-sm text-ink-soft">The payment was cancelled. You have not been charged.</p> : null}

      {user.plan !== "pro" ? (
        <div className="mt-10 rounded-2xl border border-hairline bg-paper p-5">
          <h2 className="text-sm font-semibold text-ink">Credit packs are for Pro members</h2>
          <p className="mt-1 text-sm text-ink-soft">On Free, your credits are all there is. Pro gives session and weekly limits instead, and lets you buy credits to keep going when one is full.</p>
          <div className="mt-4">
            <RedirectButton action={startSubscription}>Upgrade to Pro</RedirectButton>
          </div>
        </div>
      ) : null}

      {user.plan === "pro" && packs.ok && packs.data.data.length > 0 ? (
        <>
          <h2 className="mt-10 text-sm font-semibold text-ink">Buy credits</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {packs.data.data.map((pack, index, all) => (
              <PackCard key={pack.id} pack={pack} highlighted={all.length > 1 && index === 1} />
            ))}
          </ul>
        </>
      ) : null}

      {payments.ok && payments.data.data.length > 0 ? (
        <>
          <h2 className="mt-10 text-sm font-semibold text-ink">Purchases</h2>
          <Receipts payments={payments.data.data} />
        </>
      ) : null}

      <h2 className="mt-10 text-sm font-semibold text-ink">History</h2>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">Nothing yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {history.map((row, index) => (
            <li key={`${row.createdAt}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0">
                <span className="block text-ink">{KIND_LABEL[row.kind] ?? row.kind}</span>
                <span className="block text-xs text-ink-soft">
                  {new Date(row.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-ink">
                {row.amount > 0 ? "+" : ""}
                {row.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
