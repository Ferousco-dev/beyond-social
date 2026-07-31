import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { type CatalogModel, type ModelFamily, modelRowSchema, toCatalogModel } from "./types";

const COLUMNS =
  "id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order";

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
  if (error !== null || data === null) return [];

  const parsed = modelRowSchema.array().safeParse(data);
  return parsed.success ? parsed.data.map(toCatalogModel) : [];
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

  const parsed = modelRowSchema.safeParse(data);
  return parsed.success ? toCatalogModel(parsed.data) : null;
}
