import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

/** The signed-in user's own profile, for the account screen. */

const profileSchema = z.object({
  email: z.string(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

export interface Account {
  readonly email: string;
  readonly fullName: string;
  readonly avatarUrl: string | null;
}

const EMPTY: Account = { email: "", fullName: "", avatarUrl: null };

export async function getAccount(): Promise<Account> {
  if (!isSupabaseConfigured) return EMPTY;

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return EMPTY;

  const { data } = await supabase
    .from("profiles")
    .select("email, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const parsed = profileSchema.safeParse(data);
  const avatarPath = parsed.success ? parsed.data.avatar_url : null;
  const { data: signedAvatar } = avatarPath
    ? await supabase.storage.from("profile-avatars").createSignedUrl(avatarPath, 2 * 60 * 60)
    : { data: null };
  return {
    // Falls back to the auth record, which always has an email even if the
    // profile row has not been provisioned yet.
    email: parsed.success ? parsed.data.email : (user.email ?? ""),
    fullName: parsed.success ? (parsed.data.full_name ?? "") : "",
    avatarUrl: signedAvatar?.signedUrl ?? null,
  };
}
