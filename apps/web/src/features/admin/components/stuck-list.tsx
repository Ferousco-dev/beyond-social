import Link from "next/link";
import { type Route } from "next";

import { type StuckItem } from "@/lib/dashboard/admin";

export function StuckList({ items }: { readonly items: StuckItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">No stuck work right now.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="rounded-lg bg-cloud px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{item.kind}</span>
            <span className="text-ink-soft">{new Date(item.since).toLocaleString()}</span>
          </div>
          <p className="mt-0.5 truncate text-ink-soft">{item.detail}</p>
          <div className="mt-1 flex gap-3">
            {item.traceId && (
              <Link
                href={`/dashboard/admin/debug?trace=${encodeURIComponent(item.traceId)}` as Route}
                className="text-ink-soft underline decoration-dotted hover:text-ink"
              >
                Trace →
              </Link>
            )}
            {item.userId && (
              <Link
                href={`/dashboard/admin/users/${item.userId}` as Route}
                className="text-ink-soft underline decoration-dotted hover:text-ink"
              >
                User →
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
