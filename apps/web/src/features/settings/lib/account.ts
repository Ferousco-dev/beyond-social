import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

/** The signed-in user's own profile, for the account screen. */

const profileSchema = z.object({
  email: z.string(),
  full_name: z.string().nullable(),
});

export interface Account {
  readonly email: string;
  readonly fullName: string;
}

const EMPTY: Account = { email: "", fullName: "" };

export async function getAccount(): Promise<Account> {
  if (!isSupabaseConfigured) return EMPTY;

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return EMPTY;

  const { data } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const parsed = profileSchema.safeParse(data);
  return {
    // Falls back to the auth record, which always has an email even if the
    // profile row has not been provisioned yet.
    email: parsed.success ? parsed.data.email : (user.email ?? ""),
    fullName: parsed.success ? (parsed.data.full_name ?? "") : "",
  };
}
