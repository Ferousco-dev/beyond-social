import { formatCompact, formatCredits } from "../lib/format";
import { type ModelCall } from "../lib/types";

/**
 * The model calls behind each run: writing the prompt, planning the shot, and
 * so on. These are included in a run's credit price rather than charged
 * separately, so this table reports volume and reliability and no price at all.
 * What the provider bills us for them is our cost, not the user's.
 */
export function ModelCalls({ calls }: { calls: readonly ModelCall[] }) {
  if (calls.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-ink">Model calls</h2>
      <p className="mt-1 text-xs text-ink-soft">
        The reasoning steps inside your runs. Included in the run price, not billed separately.
      </p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-hairline bg-paper">
        <table className="w-full min-w-[38rem] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-soft">
              <th scope="col" className="px-4 py-3 font-medium">
                Step
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Model
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Calls
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Cached
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Tokens
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Median
              </th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr
                key={`${call.task}:${call.model}:${call.provider}`}
                className="border-b border-hairline last:border-0"
              >
                <th scope="row" className="px-4 py-3 text-left font-normal text-ink">
                  {call.task}
                </th>
                <td className="px-4 py-3 text-ink-soft">{call.model}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                  {formatCredits(call.calls)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                  {formatCredits(call.cached)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                  {formatCompact(call.inputTokens + call.outputTokens)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                  {call.p50LatencyMs}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
