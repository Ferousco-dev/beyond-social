import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * A narrow, typed seam for the two deletion functions.
 *
 * `database.types.ts` is generated from the linked project and does not know
 * about 0042 yet, so calling these through the generated client would not
 * typecheck. Rather than weaken the client's types everywhere, the cast is
 * confined to this file and the payload stays `unknown`, so every caller is
 * still forced through a Zod parse. Delete this once the generated types are
 * regenerated and call `supabase.rpc` directly.
 */

type AccountRpcArgs = {
  readonly request_account_deletion: { readonly p_reason: string | null };
  readonly is_account_deleted: Record<string, never>;
};

type RpcResponse = { readonly data: unknown; readonly error: { readonly message: string } | null };

type RpcClient = {
  rpc: <K extends keyof AccountRpcArgs>(fn: K, args: AccountRpcArgs[K]) => PromiseLike<RpcResponse>;
};

export async function accountRpc<K extends keyof AccountRpcArgs>(
  fn: K,
  args: AccountRpcArgs[K],
): Promise<RpcResponse> {
  const supabase = await createClient();
  return (supabase as unknown as RpcClient).rpc(fn, args);
}
