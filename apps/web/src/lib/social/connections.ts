import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/env";

import { identify } from "./identity";
import type { TokenResponse } from "./oauth";
import { configuredPlatforms, platformConfig, type SocialPlatform } from "./platforms";

/**
 * Reading and writing connected accounts.
 *
 * Writes go through the service role because the tokens table denies clients
 * entirely; reads for the UI go through the caller's own session against the
 * `social_connections_public` view, which has no token columns.
 */

const connectionRowSchema = z.object({
  platform: z.string(),
  account_name: z.string(),
  external_account_id: z.string(),
  active: z.boolean(),
  expires_at: z.string().nullable(),
});

export interface SocialConnection {
  readonly platform: SocialPlatform;
  readonly label: string;
  readonly accountName: string;
  readonly connected: boolean;
  /** True when credentials exist for this platform at all. */
  readonly available: boolean;
  readonly expiresAt: string | null;
}

/**
 * Every platform, connected or not, so the settings page renders the full set
 * and can explain why one is unavailable rather than silently omitting it.
 */
export async function listConnections(): Promise<readonly SocialConnection[]> {
  const available = new Set(configuredPlatforms());
  const rows = new Map<string, z.infer<typeof connectionRowSchema>>();

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("social_connections_public")
        .select("platform, account_name, external_account_id, active, expires_at");
      for (const row of data ?? []) {
        const parsed = connectionRowSchema.safeParse(row);
        if (parsed.success) rows.set(parsed.data.platform, parsed.data);
      }
    }
  }

  return (["tiktok", "instagram", "facebook", "youtube"] as const).map((platform) => {
    const row = rows.get(platform);
    return {
      platform,
      label: platformConfig(platform).label,
      accountName: row?.account_name ?? "",
      connected: row?.active ?? false,
      available: available.has(platform),
      expiresAt: row?.expires_at ?? null,
    };
  });
}

/**
 * Stores a freshly authorised connection, replacing any previous one for the
 * same platform. Upsert on (user, platform) is what makes reconnecting after an
 * expiry idempotent rather than accumulating dead rows.
 */
export async function saveConnection(
  userId: string,
  platform: SocialPlatform,
  token: TokenResponse,
): Promise<void> {
  const identity = await identify(platform, token);
  const service = createServiceClient();

  const { error } = await service.from("social_connections").upsert(
    {
      user_id: userId,
      platform,
      external_account_id: identity.id,
      account_name: identity.name,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_at: token.expiresAt?.toISOString() ?? null,
      scopes: [...token.scopes],
      revoked_at: null,
    } as never,
    { onConflict: "user_id,platform" },
  );

  if (error) throw new Error(`Could not save the ${platform} connection: ${error.message}`);
}

/** Marks a connection revoked and clears its tokens. */
export async function disconnect(platform: SocialPlatform): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("social_connection_revoke", { p_platform: platform });
  if (error) throw new Error(`Could not disconnect ${platform}: ${error.message}`);
}
