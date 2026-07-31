import "server-only";

import { createClient } from "@/lib/auth/supabase";

/**
 * Narrow view of the Supabase client for the debug RPCs.
 *
 * The hand-written database type covers auth only, so the typed `rpc` overloads
 * do not know these function names. The narrowing happens here and once, and
 * every result is parsed by a Zod schema before it is used. Delete this adapter
 * once `database.types.ts` is generated.
 */
export type RpcArgs = Record<string, string | number | null>;

interface RpcResponse {
  data: unknown;
  error: { message: string } | null;
}

interface DebugRpcClient {
  rpc(fn: string, args: RpcArgs): PromiseLike<RpcResponse>;
}

async function call(fn: string, args: RpcArgs): Promise<RpcResponse> {
  const supabase = (await createClient()) as unknown as DebugRpcClient;
  return supabase.rpc(fn, args);
}

/**
 * One read, or null when it could not be answered.
 *
 * Null is never folded into an empty result: "no failures today" and "we could
 * not ask" are opposite answers, and a debugging tool that confuses them sends
 * an operator looking in the wrong place.
 */
export async function readDebugRpc(fn: string, args: RpcArgs): Promise<unknown> {
  const { data, error } = await call(fn, args);
  if (error) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

/**
 * One write, keeping the database's refusal message.
 *
 * The refusals are the interesting outcomes here: "Post already reached the
 * platform" is the guard doing its job, and collapsing it into a generic
 * failure would hide the one thing the operator needs to know.
 */
export async function writeDebugRpc(
  fn: string,
  args: RpcArgs,
): Promise<{ row: unknown } | { message: string }> {
  const { data, error } = await call(fn, args);
  if (error) return { message: error.message };
  return { row: Array.isArray(data) ? (data[0] ?? null) : data };
}
