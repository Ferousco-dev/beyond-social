import Link from "next/link";
import { type Route } from "next";

import type { AssetGroup } from "@/lib/go-api/schemas";

/** Asset groups: one card per concept, named avatar001 and on. */
export function GroupList({ groups }: { groups: readonly AssetGroup[] }) {
  if (groups.length === 0) {
    return <p className="mt-6 text-sm text-ink-soft">No groups yet. Create the first one below.</p>;
  }
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const filled = [group.slots.face, group.slots.voice, group.slots.product, group.slots.environment].filter(
          (slot) => slot !== "",
        ).length;
        return (
          <li key={group.id}>
            <Link
              href={`/dashboard/assets/${group.id}` as Route}
              className="block rounded-2xl border border-hairline bg-paper p-4 transition-colors hover:bg-cloud/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <p className="text-sm font-semibold text-ink">{group.name}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {filled} of 4 slots filled · {group.extras.length} extras
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
