/**
 * Behaviour checks for the model catalogue parse layer.
 *
 * The catalogue is the one table whose shape is agreed in two places: a check
 * constraint in the database and a Zod enum in this build. Nothing in the type
 * system relates them, and when they drifted the market rendered "no models"
 * while the rows were sitting there readable, which reads exactly like an RLS
 * fault and is not one. This asserts the agreement against the live rows.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/catalog-smoke.ts
 */
import { MODEL_FAMILIES, modelRowSchema, toCatalogModel } from "../src/lib/models/types";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function fetchActiveRows(): Promise<readonly unknown[]> {
  if (KEY === undefined) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");

  const response = await fetch(
    `${URL}/rest/v1/model_catalog?select=id,provider,name,family,description,capabilities,credit_cost,min_plan,is_active,sort_order&is_active=eq.true`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
  );
  if (!response.ok) throw new Error(`catalogue read failed: ${response.status}`);

  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error("catalogue did not return an array");
  return body;
}

async function main(): Promise<void> {
  const rows = await fetchActiveRows();

  // An empty catalogue would make every check below vacuously true, so the
  // count is asserted before anything is read from it.
  check("the catalogue has active rows", rows.length > 0, `${rows.length} rows`);

  for (const row of rows) {
    const parsed = modelRowSchema.safeParse(row);
    const id: unknown = (row as { id?: unknown }).id;
    const label = typeof id === "string" ? id : "unknown row";
    check(
      `parses ${label}`,
      parsed.success,
      parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join(", "),
    );
    // A row that survives the schema must also survive the mapper, since the
    // market only ever sees the mapped shape.
    if (parsed.success) {
      const model = toCatalogModel(parsed.data);
      check(`maps ${label}`, model.id === parsed.data.id && model.creditCost >= 0);
    }
  }

  // The drift guard. Every family the database is willing to store must be a
  // family this build can parse, otherwise one unknown row is enough to empty
  // a page. Checked against the constraint, not just the rows that exist now,
  // so an inactive family still fails here rather than on the day it ships.
  const constrained = ["video", "image", "chat", "audio", "avatar"];
  const missing = constrained.filter(
    (family) => !(MODEL_FAMILIES as readonly string[]).includes(family),
  );
  check("every family the constraint allows is parseable", missing.length === 0, missing.join(", "));

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
