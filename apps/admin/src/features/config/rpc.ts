import "server-only";

import { createClient } from "@/lib/auth/supabase";

import { configRowSchema, configRowsSchema, type ConfigJson, type ConfigRow } from "./schemas";

/**
 * Minimal view of the Supabase client for the config RPCs, matching the health
 * feature's adapter. The console does not ship generated database types, so the
 * narrowing happens here once and every result is parsed by Zod before use.
 * Delete this adapter when `database.types.ts` is generated.
 */
interface ConfigRpcClient {
  rpc(
    fn: string,
    args?: Record<string, string | ConfigJson>,
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

/**
 * Every configuration row, or null when the call failed.
 *
 * `admin_app_config_all` raises 'Admin only' in the database, so a non-admin
 * gets null here rather than data. The page must not crash on null, because a
 * configuration screen that white-screens during an incident is worse than one
 * that says it could not read.
 */
export async function fetchConfigRows(): Promise<readonly ConfigRow[] | null> {
  const supabase = (await createClient()) as unknown as ConfigRpcClient;
  const { data, error } = await supabase.rpc("admin_app_config_all");
  if (error) return null;

  const parsed = configRowsSchema.safeParse(data);
  if (!parsed.success) {
    console.error("app_config rows did not match the expected shape", parsed.error.message);
    return null;
  }
  return parsed.data;
}

export type SetConfigResult = { ok: true; row: ConfigRow } | { ok: false; message: string };

/**
 * Writes one value. The audit row is written inside `admin_set_app_config`, so
 * a successful result here always has a corresponding entry in the audit log.
 */
export async function setConfigRow(
  key: string,
  value: ConfigJson,
  ip: string | null,
): Promise<SetConfigResult> {
  const supabase = (await createClient()) as unknown as ConfigRpcClient;
  const { data, error } = await supabase.rpc("admin_set_app_config", {
    p_key: key,
    p_value: value,
    p_ip: ip,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = configRowSchema.safeParse(row);
  if (!parsed.success) {
    return { ok: false, message: "The value was written but the response could not be read." };
  }
  return { ok: true, row: parsed.data };
}
