import "server-only";

import { type User } from "@supabase/supabase-js";
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
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
