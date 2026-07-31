import { formatCredits } from "../lib/format";
import { type UsageModel } from "../lib/types";

/**
 * Where the credits went, by model. The bar is a share of the busiest model
 * rather than of the total, so a long tail stays visible instead of collapsing
 * into a sliver.
 */
export function ModelBreakdown({ models }: { models: readonly UsageModel[] }) {
  const net = (model: UsageModel): number => model.creditsSpent - model.creditsRefunded;
  const peak = Math.max(...models.map(net), 1);

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-ink">By model</h2>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-hairline bg-paper">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-soft">
              <th scope="col" className="px-4 py-3 font-medium">
                Model
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Runs
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Failed
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Refunded
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Credits
              </th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.model} className="border-b border-hairline last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <span className="block text-ink">{model.name}</span>
                  <span
                    className="mt-1 block h-1 rounded-full bg-primary"
                    style={{ width: `${Math.max((net(model) / peak) * 100, 2)}%` }}
                    aria-hidden
                  />
                </th>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                  {formatCredits(model.runs)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                  {formatCredits(model.failed)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                  {formatCredits(model.creditsRefunded)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">
                  {formatCredits(net(model))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
