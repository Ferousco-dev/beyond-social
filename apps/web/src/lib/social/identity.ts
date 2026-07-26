import "server-only";

import type { TokenResponse } from "./oauth";
import type { SocialPlatform } from "./platforms";

/**
 * Resolves which account a token belongs to.
 *
 * Each platform answers this differently, and the answer matters: the id is
 * what later publish calls address, and the name is the only way a user can
 * tell which of several accounts they connected. A failure here is not fatal,
 * because a connection with an unlabelled account still publishes.
 */

export interface AccountIdentity {
  readonly id: string;
  readonly name: string;
}

const UNKNOWN: AccountIdentity = { id: "unknown", name: "" };

type Fetch = typeof globalThis.fetch;

async function getJson(
  url: string,
  token: string,
  doFetch: Fetch,
): Promise<Record<string, unknown> | null> {
  const response = await doFetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  return (await response.json().catch(() => null)) as Record<string, unknown> | null;
}

export async function identify(
  platform: SocialPlatform,
  token: TokenResponse,
  doFetch: Fetch = globalThis.fetch,
): Promise<AccountIdentity> {
  try {
    switch (platform) {
      case "tiktok":
        return await tiktok(token, doFetch);
      case "youtube":
        return await youtube(token.accessToken, doFetch);
      case "facebook":
      case "instagram":
        return await meta(platform, token.accessToken, doFetch);
    }
  } catch {
    // Identity is a nicety; never fail a successful authorisation over it.
    return UNKNOWN;
  }
}

async function tiktok(token: TokenResponse, doFetch: Fetch): Promise<AccountIdentity> {
  const body = await getJson(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
    token.accessToken,
    doFetch,
  );
  const user = (body?.data as { user?: { open_id?: string; display_name?: string } } | undefined)
    ?.user;
  return {
    // The token response already carries open_id, so it is the better default.
    id: token.externalAccountId ?? user?.open_id ?? UNKNOWN.id,
    name: user?.display_name ?? "",
  };
}

async function youtube(token: string, doFetch: Fetch): Promise<AccountIdentity> {
  const body = await getJson(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    token,
    doFetch,
  );
  const items = body?.items as { id?: string; snippet?: { title?: string } }[] | undefined;
  const channel = items?.[0];
  return { id: channel?.id ?? UNKNOWN.id, name: channel?.snippet?.title ?? "" };
}

/**
 * Meta publishing targets a Page, not the person who authorised, so the useful
 * identity is the first Page the token can manage. Instagram goes one step
 * further: the Reel is posted to the IG business account linked to that Page.
 */
async function meta(
  platform: "facebook" | "instagram",
  token: string,
  doFetch: Fetch,
): Promise<AccountIdentity> {
  const body = await getJson(
    "https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username}",
    token,
    doFetch,
  );
  const pages = body?.data as
    | {
        id?: string;
        name?: string;
        instagram_business_account?: { id?: string; username?: string };
      }[]
    | undefined;
  const page = pages?.[0];
  if (!page) return UNKNOWN;

  if (platform === "instagram") {
    const ig = page.instagram_business_account;
    // A Page with no linked Instagram business account cannot publish Reels, so
    // this is surfaced as unknown rather than silently storing the Page id.
    return ig?.id ? { id: ig.id, name: ig.username ?? "" } : UNKNOWN;
  }
  return { id: page.id ?? UNKNOWN.id, name: page.name ?? "" };
}
