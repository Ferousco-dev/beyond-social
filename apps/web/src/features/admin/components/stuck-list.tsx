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
        </li>
      ))}
    </ul>
  );
}
