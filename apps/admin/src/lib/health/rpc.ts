import "server-only";

import { createClient } from "@/lib/auth/supabase";

/**
 * Minimal view of the Supabase client for the health RPCs.
 *
 * The console's hand-written database type covers auth only, so the typed `rpc`
 * overloads do not know these function names. Rather than widen that type with
 * every feature's functions, the narrowing happens here and once, and every
 * result is parsed by a Zod schema before it is used. Delete this adapter and
 * call `supabase.rpc` directly once `database.types.ts` is generated.
 */
type RpcArgs = Record<string, string | number>;

interface RpcResponse {
  data: unknown;
  error: unknown;
}

interface HealthRpcClient {
  rpc(fn: string, args: RpcArgs): PromiseLike<RpcResponse>;
}

/**
 * Calls one admin health function and returns its single row, or null when the
 * call failed or the caller is not an admin. The functions raise 'Admin only'
 * in the database, so a non-admin gets null here rather than data.
 */
export async function callHealthRpc(fn: string, args: RpcArgs): Promise<unknown> {
  const supabase = (await createClient()) as unknown as HealthRpcClient;
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return null;

  return Array.isArray(data) ? (data[0] ?? null) : data;
}
