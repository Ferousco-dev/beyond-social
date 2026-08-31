import { env } from "../config/env";

/**
 * Refreshing an expired social OAuth token, worker-side.
 *
 * Deliberately a small, standalone copy of the token shape the web app's
 * `lib/social/oauth.ts` already knows, not a cross-package import: the worker
 * and the web app are separate deployables with their own dependency trees,
 * and there is no shared package between them for this today. The trade is a
 * second place that could drift if a provider's token endpoint changes, kept
 * small on purpose to make that unlikely and cheap to notice.
 *
 * `social_connections.refresh_token`'s own column comment already anticipated
 * this: "set when a refresh fails ... so the publish worker can fail with a
 * reconnect message instead of a raw 401." The column existed; this is the
 * refresh that was supposed to happen before that failure path, not after it.
 */

export type RefreshablePlatform = "tiktok" | "instagram" | "facebook" | "youtube";

interface TokenEndpoint {
  readonly tokenUrl: string;
  readonly clientIdParam: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

const ENDPOINTS: Readonly<Record<RefreshablePlatform, TokenEndpoint>> = {
  tiktok: {
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    clientIdParam: "client_key",
    clientId: env.TIKTOK_CLIENT_KEY,
    clientSecret: env.TIKTOK_CLIENT_SECRET,
  },
  // Meta issues one long-lived Page token per app, and both Instagram and
  // Facebook publish through it, so both platforms refresh the same way.
  instagram: {
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    clientIdParam: "client_id",
    clientId: env.META_APP_ID,
    clientSecret: env.META_APP_SECRET,
  },
  facebook: {
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    clientIdParam: "client_id",
    clientId: env.META_APP_ID,
    clientSecret: env.META_APP_SECRET,
  },
  youtube: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdParam: "client_id",
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
};

export interface RefreshedToken {
  readonly accessToken: string;
  /** Providers that rotate refresh tokens return a new one; others do not. */
  readonly refreshToken: string;
  readonly expiresAt: Date | null;
}

interface RawToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  data?: { access_token?: string; refresh_token?: string; expires_in?: number };
  error?: string;
  error_description?: string;
}

/** True only when this worker actually has both halves of that platform's credentials. */
export function canRefresh(platform: string): platform is RefreshablePlatform {
  const endpoint = (ENDPOINTS as Record<string, TokenEndpoint | undefined>)[platform];
  return endpoint !== undefined && endpoint.clientId !== "" && endpoint.clientSecret !== "";
}

export async function refreshAccessToken(
  platform: RefreshablePlatform,
  refreshToken: string,
): Promise<RefreshedToken> {
  const endpoint = ENDPOINTS[platform];

  const response = await fetch(endpoint.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      [endpoint.clientIdParam]: endpoint.clientId,
      client_secret: endpoint.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  const raw = (await response.json().catch(() => null)) as RawToken | null;
  const payload = raw?.data ?? raw ?? {};
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `${platform} refresh failed: ${raw?.error_description ?? raw?.error ?? response.status}`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken,
    expiresAt:
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null,
  };
}

const inFlightRefreshes = new Map<string, Promise<RefreshedToken>>();

/**
 * `refreshAccessToken`, deduped per connection within this worker process.
 *
 * The publish worker runs several jobs concurrently, and more than one
 * scheduled post for the same connection commonly lands in the same batch.
 * Each job reads `social_connections` independently, so two jobs can both
 * see the same not-yet-refreshed token and both call this with the same
 * refresh token. A provider that rotates refresh tokens on use (TikTok's
 * own docs say so) accepts only the first of those two calls; the second
 * gets an `invalid_grant`-shaped failure that looks identical to a dead
 * connection, and `publish.ts` reacts to it by revoking a connection the
 * first call just repaired. Keying the in-flight promise by connection
 * rather than by refresh token means the second caller awaits the same
 * request instead of issuing its own.
 */
export function refreshAccessTokenOnce(
  connectionKey: string,
  platform: RefreshablePlatform,
  refreshToken: string,
): Promise<RefreshedToken> {
  const existing = inFlightRefreshes.get(connectionKey);
  if (existing) return existing;

  const promise = refreshAccessToken(platform, refreshToken).finally(() => {
    // Only this call's own entry, never a newer one a later job may have
    // already started after this one settled.
    if (inFlightRefreshes.get(connectionKey) === promise) {
      inFlightRefreshes.delete(connectionKey);
    }
  });
  inFlightRefreshes.set(connectionKey, promise);
  return promise;
}
