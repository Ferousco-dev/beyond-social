import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { type CatalogModel, type ModelFamily, modelRowSchema, toCatalogModel } from "./types";

const COLUMNS =
  "id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order";

/**
 * Rows are parsed one at a time rather than as an array, so a single row this
 * build does not understand costs that one card instead of the whole
 * catalogue. Parsing the array meant a migration that widened a column emptied
 * the market and read exactly like an RLS fault, which is why the drop is
 * logged rather than swallowed.
 */
function parseRows(rows: readonly unknown[]): readonly CatalogModel[] {
  const models: CatalogModel[] = [];
  for (const row of rows) {
    const parsed = modelRowSchema.safeParse(row);
    if (parsed.success) models.push(toCatalogModel(parsed.data));
    else logger.warn("model_catalog row rejected", { issues: parsed.error.issues });
  }
  return models;
}

/**
 * The models the market renders. RLS already hides inactive rows, so an empty
 * result means the catalogue is genuinely empty rather than filtered away.
 */
export async function listModels(family?: ModelFamily): Promise<readonly CatalogModel[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  let query = supabase.from("model_catalog").select(COLUMNS).eq("is_active", true);
  if (family !== undefined) query = query.eq("family", family);

  const { data, error } = await query.order("sort_order", { ascending: true });
  if (error !== null || data === null) {
    logger.error("model_catalog list failed", { message: error?.message });
    return [];
  }

  return parseRows(data);
}

/** One model, for the composer's "this run costs N credits" line. */
export async function getModel(id: string): Promise<CatalogModel | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("model_catalog")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error !== null || data === null) return null;

  const [model] = parseRows([data]);
  return model ?? null;
}
