import { type User } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createClient } from "./supabase";

export type AdminUser = { user: User; email: string };

/**
 * The signed-in admin, or a 404.
 *
 * The middleware already refuses non-admins, so this is defence in depth rather
 * than the only gate: a page rendered through a path the matcher somehow missed
 * still cannot read anything. It also gives pages the identity they need
 * without a second round trip, since `cache` scopes the result to one request
 * and therefore cannot carry an identity between users.
 */
export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) notFound();

  return { user, email: user.email ?? "unknown" };
});
