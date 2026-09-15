import { type RateLimitScope } from "@/lib/dashboard/admin";

export function RateLimitList({ scopes }: { readonly scopes: RateLimitScope[] }) {
  if (scopes.length === 0) {
    return <p className="text-sm text-ink-soft">No active rate-limit windows.</p>;
  }

  return (
    <ul className="space-y-2">
      {scopes.map((scope) => (
        <li key={scope.scope} className="flex items-center justify-between gap-2 rounded-lg bg-cloud px-3 py-2 text-xs">
          <span className="font-medium text-ink">{scope.scope}</span>
          <span className="text-ink-soft tabular-nums">
            {scope.keys} keys · peak {scope.peakCount}
          </span>
        </li>
      ))}
    </ul>
  );
}
