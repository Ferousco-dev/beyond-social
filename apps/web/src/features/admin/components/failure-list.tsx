import { type FailureItem } from "@/lib/dashboard/admin";

export function FailureList({ items }: { readonly items: FailureItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">No failures in the last 24 hours.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="rounded-lg bg-destructive/5 px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">
              {item.kind} · {item.detail}
            </span>
            <span className="shrink-0 text-ink-soft">{new Date(item.failedAt).toLocaleString()}</span>
          </div>
          {item.error && <p className="mt-0.5 truncate text-destructive">{item.error}</p>}
        </li>
      ))}
    </ul>
  );
}
