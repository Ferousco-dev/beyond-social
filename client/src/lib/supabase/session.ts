import "server-only";

import { cache } from "react";

import { createClient } from "./server";

/**
 * The signed-in user, resolved once per request.
 *
 * `auth.getUser()` is a network call to Supabase Auth, and a single dashboard
 * render made several of them: the sidebar identity, the project list and the
 * current plan each asked independently. They are the same question, so they
 * were the same answer arriving three times, one after another, in the path of
 * every navigation.
 *
 * React's `cache` scopes memoisation to one request, so this cannot leak an
 * identity between users the way a module-level variable would.
 */
export interface AuthUser {
  readonly email: string | undefined;
  readonly user_metadata: Readonly<Record<string, unknown>>;
}

/**
 * Identity comes from the signed token itself (`getClaims`), checked against the
 * project's public keys, which are cached. That removes the round trip to
 * Supabase Auth that `getUser` made on every page change. Projects still on a
 * shared secret fall back to the network check inside the library, so this is
 * never less safe than before.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { email: typeof claims.email === "string" ? claims.email : undefined, user_metadata: claims.user_metadata ?? {} };
});
