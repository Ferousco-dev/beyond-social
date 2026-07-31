import "server-only";

import { createClient } from "@/lib/auth/supabase";

/**
 * Minimal view of the Supabase client for the secrets RPCs, matching the
 * adapter in lib/health. The console's hand-written database type covers auth
 * only, so the typed `rpc` overloads do not know these function names. Every
 * result is parsed by a Zod schema before it is used.
 *
 * Delete this adapter and call `supabase.rpc` directly once the generated
 * `database.types.ts` exists.
 */
export type SecretsRpcArgs = Record<string, string | boolean | null>;

interface RpcResponse {
  data: unknown;
  error: { message: string } | null;
}

interface SecretsRpcClient {
  rpc(fn: string, args?: SecretsRpcArgs): PromiseLike<RpcResponse>;
}

export interface RpcResult {
  readonly data: unknown;
  readonly error: string | null;
}

/**
 * Calls one admin secrets function. The functions raise 'Admin only' in the
 * database, so a non-admin gets an error here rather than data, and the check
 * cannot be skipped by reaching this helper from somewhere else.
 */
export async function callSecretsRpc(fn: string, args?: SecretsRpcArgs): Promise<RpcResult> {
  const supabase = (await createClient()) as unknown as SecretsRpcClient;
  const { data, error } = await supabase.rpc(fn, args);

  return { data, error: error ? error.message : null };
}
