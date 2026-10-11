import { type CreditSpendByModel } from "@/lib/dashboard/admin";

/** One account's credit spend by model, mirroring AiSpendTable's shape but
 * scoped to a single user instead of the whole platform. */
export function CreditSpendTable({ rows }: { readonly rows: CreditSpendByModel[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-soft">No credit spend in this window.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-paper">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead>
          <tr className="text-ink-soft">
            <th className="px-4 py-2 font-medium">Provider / model</th>
            <th className="px-3 py-2 font-medium">Generations</th>
            <th className="px-4 py-2 font-medium">Credits spent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.provider}-${row.model}`} className="border-t border-hairline">
              <td className="px-4 py-2 text-ink">
                {row.provider} / {row.model}
              </td>
              <td className="px-3 py-2 tabular-nums text-ink-soft">{row.generations}</td>
              <td className="px-4 py-2 tabular-nums text-ink">{row.creditsSpent.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
