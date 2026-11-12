"use client";

import { useState, type ReactNode } from "react";

const PAGE = 15;

const KIND_LABEL: Readonly<Record<string, string>> = {
  grant: "Welcome credits",
  purchase: "Credits added",
  reserve: "Used",
  settle: "Adjusted",
  refund: "Refunded",
  adjust: "Adjustment",
};

export interface CreditRow {
  readonly kind: string;
  readonly amount: number;
  readonly createdAt: string;
}

/** The credit history, fifteen rows first and fifteen more on request. */
export function CreditHistory({ history }: { readonly history: readonly CreditRow[] }): ReactNode {
  const [shown, setShown] = useState(PAGE);
  if (history.length === 0) return <p className="mt-2 text-sm text-ink-soft">Nothing yet.</p>;
  return (
    <>
      <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
        {history.slice(0, shown).map((row, index) => (
          <li key={`${row.createdAt}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0">
              <span className="block text-ink">{KIND_LABEL[row.kind] ?? row.kind}</span>
              <span className="block text-xs text-ink-soft">{new Date(row.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
            </span>
            <span className="shrink-0 tabular-nums text-ink">
              {row.amount > 0 ? "+" : ""}
              {row.amount}
            </span>
          </li>
        ))}
      </ul>
      {history.length > shown ? (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-3 inline-flex h-10 cursor-pointer items-center rounded-lg border border-hairline px-4 text-sm font-medium text-ink hover:bg-cloud">
          View more
        </button>
      ) : null}
    </>
  );
}
