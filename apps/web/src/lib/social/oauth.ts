import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { platformConfig, redirectUri, type SocialPlatform } from "./platforms";

/**
 * OAuth 2.0 authorization-code helpers shared by every platform.
 *
 * The security-relevant parts are the state parameter and PKCE. State is what
 * stops an attacker completing the flow with their own code and silently
 * binding their account to our user's; PKCE stops an intercepted code being
 * redeemed by anyone but us.
 */

export const STATE_COOKIE = "social_oauth_state";
export const VERIFIER_COOKIE = "social_oauth_verifier";

/** Ten minutes is long enough to finish a consent screen, short enough to bound replay. */
export const OAUTH_COOKIE_MAX_AGE = 600;

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function newState(): string {
  return base64Url(randomBytes(32));
}

export function newVerifier(): string {
  return base64Url(randomBytes(32));
}

/** S256 challenge, the only PKCE method TikTok accepts. */
export function challengeFor(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

/** Constant-time, so a mismatch cannot be probed a character at a time. */
export function statesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export interface AuthorizeUrlOptions {
  platform: SocialPlatform;
  appUrl: string;
  state: string;
  /** Present only for platforms using PKCE. */
  verifier?: string;
}

export function buildAuthorizeUrl(options: AuthorizeUrlOptions): string {
  const config = platformConfig(options.platform);
  const url = new URL(config.authorizeUrl);

  url.searchParams.set(config.clientIdParam, config.clientId);
  url.searchParams.set("redirect_uri", redirectUri(options.platform, options.appUrl));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(config.id === "tiktok" ? "," : " "));
  url.searchParams.set("state", options.state);
  for (const [key, value] of Object.entries(config.authorizeParams)) {
    url.searchParams.set(key, value);
  }
  if (config.usesPkce && options.verifier) {
    url.searchParams.set("code_challenge", challengeFor(options.verifier));
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  /** Absolute expiry, or null when the platform issues non-expiring tokens. */
  expiresAt: Date | null;
  scopes: readonly string[];
  /** The platform's own id for the authorising account, when it returns one. */
  externalAccountId: string | null;
}

interface RawToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  open_id?: string;
  data?: { access_token?: string; refresh_token?: string; expires_in?: number; open_id?: string };
  error?: string;
  error_description?: string;
}

export interface ExchangeOptions {
  platform: SocialPlatform;
  appUrl: string;
  code: string;
  verifier?: string;
  fetchImpl?: typeof globalThis.fetch;
}

/**
 * Trades an authorization code for tokens.
 *
 * Every provider here accepts a form-encoded body, but they disagree about
 * where the payload lives in the response: TikTok nests it under `data` on some
 * endpoints and returns it flat on others, so both shapes are accepted.
 */
export async function exchangeCode(options: ExchangeOptions): Promise<TokenResponse> {
  const config = platformConfig(options.platform);
  const doFetch = options.fetchImpl ?? globalThis.fetch;

  const body = new URLSearchParams({
    [config.clientIdParam]: config.clientId,
    client_secret: config.clientSecret,
    code: options.code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(options.platform, options.appUrl),
  });
  if (config.usesPkce && options.verifier) body.set("code_verifier", options.verifier);

  const response = await doFetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });

  const raw = (await response.json().catch(() => null)) as RawToken | null;
  const payload = raw?.data ?? raw ?? {};
  const accessToken = payload.access_token;

  if (!response.ok || !accessToken) {
    // The description is echoed because these failures are almost always a
    // misconfigured redirect URI, and the provider says so precisely.
    throw new Error(
      `${config.label} token exchange failed: ${raw?.error_description ?? raw?.error ?? response.status}`,
    );
  }

  return {
    accessToken,
    refreshToken: payload.refresh_token ?? null,
    expiresAt:
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null,
    scopes: raw?.scope ? raw.scope.split(/[,\s]+/).filter(Boolean) : config.scopes,
    externalAccountId: payload.open_id ?? null,
  };
}

/** Refreshes an expiring token. Meta long-lived tokens are renewed differently. */
export async function refreshToken(
  platform: SocialPlatform,
  token: string,
  fetchImpl?: typeof globalThis.fetch,
): Promise<TokenResponse> {
  const config = platformConfig(platform);
  const doFetch = fetchImpl ?? globalThis.fetch;

  const response = await doFetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      [config.clientIdParam]: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: token,
    }).toString(),
  });

  const raw = (await response.json().catch(() => null)) as RawToken | null;
  const payload = raw?.data ?? raw ?? {};
  if (!response.ok || !payload.access_token) {
    throw new Error(
      `${config.label} refresh failed: ${raw?.error_description ?? raw?.error ?? response.status}`,
    );
  }

  return {
    accessToken: payload.access_token,
    // Providers that rotate refresh tokens return a new one; those that do not
    // expect the original to be reused, so it is carried forward.
    refreshToken: payload.refresh_token ?? token,
    expiresAt:
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null,
    scopes: raw?.scope ? raw.scope.split(/[,\s]+/).filter(Boolean) : config.scopes,
    externalAccountId: payload.open_id ?? null,
  };
}
