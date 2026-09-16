import { type AiSpendByModel } from "@/lib/dashboard/admin";

export function AiSpendTable({ rows }: { readonly rows: AiSpendByModel[] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-hairline bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Spend by model</h2>
        <p className="mt-2 text-sm text-ink-soft">No AI usage in this window.</p>
      </section>
    );
  }

  return (
    <section className="overflow-x-auto rounded-xl border border-hairline bg-paper">
      <h2 className="px-5 pt-5 text-sm font-semibold text-ink">Spend by model</h2>
      <table className="mt-3 w-full min-w-[560px] text-left text-xs">
        <thead>
          <tr className="border-t border-hairline text-ink-soft">
            <th className="px-5 py-2 font-medium">Provider / model</th>
            <th className="px-3 py-2 font-medium">Calls</th>
            <th className="px-3 py-2 font-medium">Failed</th>
            <th className="px-3 py-2 font-medium">Input tokens</th>
            <th className="px-3 py-2 font-medium">Output tokens</th>
            <th className="px-5 py-2 font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.provider}-${row.model}`} className="border-t border-hairline">
              <td className="px-5 py-2 text-ink">
                {row.provider} / {row.model}
              </td>
              <td className="px-3 py-2 tabular-nums text-ink-soft">{row.calls}</td>
              <td
                className={`px-3 py-2 tabular-nums ${row.failedCalls > 0 ? "text-destructive" : "text-ink-soft"}`}
              >
                {row.failedCalls}
              </td>
              <td className="px-3 py-2 tabular-nums text-ink-soft">
                {row.inputTokens.toLocaleString()}
              </td>
              <td className="px-3 py-2 tabular-nums text-ink-soft">
                {row.outputTokens.toLocaleString()}
              </td>
              <td className="px-5 py-2 tabular-nums text-ink">${row.costUsd.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
