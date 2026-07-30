import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

import { DEFAULT_TIMEZONE, isValidTimeZone } from "./zone";

/**
 * The signed-in user's timezone, once per request.
 *
 * Cached for the same reason the auth lookup is: several parts of a page want
 * to render a time, and each asking the database independently turns one value
 * into several round trips inside a single render.
 *
 * Falls back to UTC rather than guessing from the server's own clock. A server
 * in Virginia rendering Lagos times as Eastern is worse than showing UTC, which
 * is at least visibly not local.
 */
export const getUserTimeZone = cache(async (): Promise<string> => {
  const user = await getAuthUser();
  if (!user) return DEFAULT_TIMEZONE;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  const stored = data?.timezone;
  return typeof stored === "string" && isValidTimeZone(stored) ? stored : DEFAULT_TIMEZONE;
});
