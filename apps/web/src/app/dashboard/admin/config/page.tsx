import { type Metadata } from "next";

import { getAppConfig } from "@/lib/dashboard/admin";
import { ConfigRow } from "@/features/admin/components/config-row";

export const metadata: Metadata = { title: "Admin · App config" };

export default async function AdminConfigPage() {
  const rows = await getAppConfig();
  const byArea = new Map<string, typeof rows>();
  for (const row of rows) {
    byArea.set(row.area, [...(byArea.get(row.area) ?? []), row]);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">App config</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Runtime numbers, not secrets. &ldquo;Immediate&rdquo; values apply on next read; &ldquo;redeploy&rdquo;
        values are only the recorded intent until the consuming code reads this table.
      </p>

      <div className="mt-6 space-y-8">
        {[...byArea.entries()].map(([area, areaRows]) => (
          <section key={area}>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {area}
            </h2>
            <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
              {areaRows.map((row) => (
                <ConfigRow key={row.key} row={row} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
