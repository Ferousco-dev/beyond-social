import { formatInZone } from "@/lib/time/zone";
import { cn } from "@/lib/utils";

import { type LedgerEntry } from "../ledger";

/**
 * Every credit movement, newest first.
 *
 * There is no invoice column. Invoices live in Stripe and this app stores no
 * invoice id or hosted URL, so a link here would either be dead or fabricated.
 * The reference is the real idempotency key behind the row, which is what
 * support actually needs to trace a charge, and receipts are reached through the
 * Stripe portal once billing is connected.
 */
export function TransactionHistory({
  entries,
  timeZone,
}: {
  entries: readonly LedgerEntry[];
  timeZone: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-ink">Transaction history</h2>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl border border-hairline bg-paper p-5 text-xs text-ink-soft">
          No credit activity yet. Grants, runs and refunds appear here as they happen.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-hairline bg-paper">
          <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
            <caption className="sr-only">Credit transactions, most recent first</caption>
            <thead>
              <tr className="border-b border-hairline text-ink-soft">
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Description
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-hairline last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {formatInZone(entry.createdAt, timeZone)}
                  </td>
                  <td className="px-4 py-3 text-ink">{entry.description}</td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-right tabular-nums",
                      entry.delta < 0 ? "text-ink-soft" : "text-success",
                    )}
                  >
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                  </td>
                  <td className="max-w-[14rem] truncate px-4 py-3 font-mono text-[11px] text-ink-soft">
                    {entry.reference ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-soft">
        Receipts and invoices are held by Stripe and are available from Manage billing once checkout
        is connected.
      </p>
    </section>
  );
}
