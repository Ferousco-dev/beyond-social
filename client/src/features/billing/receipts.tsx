import { type ReactNode } from "react";

import { type Payment } from "@/lib/go-api/schemas";

import { formatPrice } from "./format";

const STATUS: Readonly<Record<Payment["status"], string>> = { pending: "Waiting", paid: "Paid", refunded: "Refunded" };

export function Receipts({ payments }: { readonly payments: readonly Payment[] }): ReactNode {
  if (payments.length === 0) return <p className="mt-2 text-sm text-ink-soft">No purchases yet.</p>;
  return (
    <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
      {payments.map((payment) => (
        <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="min-w-0">
            <span className="block text-ink">
              {payment.pack_name} · {payment.credits.toLocaleString("en-US")} credits
            </span>
            <span className="block text-xs text-ink-soft">
              {new Date(payment.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })} · {STATUS[payment.status]}
            </span>
          </span>
          <span className="shrink-0 tabular-nums text-ink">{formatPrice(payment.amount_cents, payment.currency)}</span>
        </li>
      ))}
    </ul>
  );
}
