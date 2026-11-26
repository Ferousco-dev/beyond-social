import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { PRICE_NAMES } from "./price-names.ts";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../server/migrations");

/** Every action the database gives a price, read from the migrations that insert into action_prices. */
function pricedActions(): string[] {
  const actions = new Set<string>();
  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql"))) {
    const sql = readFileSync(path.join(MIGRATIONS, file), "utf8");
    for (const block of sql.matchAll(/insert into public\.action_prices[\s\S]*?;/giu)) {
      for (const row of block[0].matchAll(/\(\s*'([a-z_]+)'\s*,/gu)) actions.add(row[1]!);
    }
  }
  return [...actions];
}

test("every priced action has a plain name on the price list in Settings", () => {
  const actions = pricedActions();
  assert.ok(actions.length > 10, "found the priced actions");
  const unnamed = actions.filter((action) => !(action in PRICE_NAMES));
  assert.deepEqual(unnamed, []);
});
