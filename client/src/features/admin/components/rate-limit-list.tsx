import Link from "next/link";
import { type Route } from "next";

import { type RateLimitScope } from "@/lib/dashboard/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function RateLimitList({ scopes }: { readonly scopes: RateLimitScope[] }) {
  if (scopes.length === 0) {
    return <p className="text-sm text-ink-soft">No active rate-limit windows.</p>;
  }

  return (
    <ul className="space-y-2">
      {scopes.map((scope) => (
        <li key={scope.scope} className="rounded-lg bg-cloud px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{scope.scope}</span>
            <span className="text-ink-soft tabular-nums">
              {scope.keys} keys · peak {scope.peakCount}
            </span>
          </div>
          {scope.topKeys.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 border-t border-hairline/60 pt-1.5">
              {scope.topKeys.map((key) => (
                <li key={key.identifier} className="flex items-center justify-between gap-2">
                  {UUID_RE.test(key.identifier) ? (
                    <Link
                      href={`/dashboard/admin/users/${key.identifier}` as Route}
                      className="truncate font-mono text-ink-soft underline decoration-dotted hover:text-ink"
                    >
                      {key.identifier}
                    </Link>
                  ) : (
                    <span className="truncate font-mono text-ink-soft">{key.identifier}</span>
                  )}
                  <span className="shrink-0 tabular-nums text-ink-soft">{key.count}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
