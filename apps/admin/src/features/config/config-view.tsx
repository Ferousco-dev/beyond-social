import { SlidersHorizontal } from "lucide-react";
import { type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";

import { ConfigField } from "./components/config-field";
import { fetchConfigRows } from "./rpc";
import { areaLabel, type ConfigRow } from "./schemas";

/**
 * The configuration console.
 *
 * Grouped by area rather than listed flat, because the question an operator
 * arrives with is "what can I turn down in the AI path", not "which key starts
 * with a t". A failed read renders as a failed read: no defaults are shown as
 * if they were the stored values.
 */
export async function ConfigView(): Promise<ReactNode> {
  const rows = await fetchConfigRows();

  if (!rows) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        title="Configuration could not be read"
        description="The admin_app_config_all function did not return. Nothing is shown rather than showing defaults that may not match what is stored."
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        title="No settings defined"
        description="Keys appear here once they exist in app_config. A key is only added when a file in this codebase reads it."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groupByArea(rows).map(([area, areaRows]) => (
        <Section
          key={area}
          title={areaLabel(area)}
          description={`${areaRows.length} ${areaRows.length === 1 ? "setting" : "settings"}.`}
        >
          <div className="flex flex-col gap-3">
            {areaRows.map((row) => (
              <ConfigField key={row.key} row={row} />
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

/** Rows arrive ordered by area then key, so grouping preserves that order. */
function groupByArea(rows: readonly ConfigRow[]): [string, ConfigRow[]][] {
  const groups = new Map<string, ConfigRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.area);
    if (existing) existing.push(row);
    else groups.set(row.area, [row]);
  }
  return [...groups];
}
