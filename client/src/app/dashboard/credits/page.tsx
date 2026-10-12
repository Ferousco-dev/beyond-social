import { type Metadata } from "next";
import { type ReactNode } from "react";

import { goApi } from "@/lib/go-api/client";
import { creditsResponse } from "@/lib/go-api/schemas";

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

export default async function CreditsPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/credits", creditsResponse);
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
