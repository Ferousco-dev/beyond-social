import "server-only";

import { serverEnv } from "@/lib/server-env";

/**
 * OAuth configuration for each publishing target.
 *
 * We integrate the platforms directly rather than through an aggregator, so
 * each one brings its own authorize endpoint, token endpoint, and scope set.
 * Keeping that in one table means the connect and callback routes are generic:
 * they read this and do not care which platform they are serving.
 *
 * Every platform is independently configurable. A missing app id or secret
 * disables that platform alone, which matters because TikTok and Instagram each
 * require their own app review and will not become available on the same day.
 */

export const SOCIAL_PLATFORMS = ["tiktok", "instagram", "facebook", "youtube"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

export interface PlatformConfig {
  readonly id: SocialPlatform;
  readonly label: string;
  readonly authorizeUrl: string;
  readonly tokenUrl: string;
  readonly scopes: readonly string[];
  readonly clientId: string;
  readonly clientSecret: string;
  /**
   * TikTok names the client id `client_key` rather than `client_id`, in both
   * the authorize query and the token body.
   */
  readonly clientIdParam: string;
  /** TikTok requires PKCE for web apps; the others do not use it. */
  readonly usesPkce: boolean;
  /** Extra authorize-URL parameters this platform needs. */
  readonly authorizeParams: Readonly<Record<string, string>>;
}

const CONFIGS: Readonly<Record<SocialPlatform, PlatformConfig>> = {
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish", "video.upload"],
    clientId: serverEnv.TIKTOK_CLIENT_KEY,
    clientSecret: serverEnv.TIKTOK_CLIENT_SECRET,
    clientIdParam: "client_key",
    usesPkce: true,
    authorizeParams: {},
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    // Publishing a Reel goes through the Instagram Graph API, which is reached
    // with a Facebook token for the Page the Instagram account is linked to.
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ],
    clientId: serverEnv.META_APP_ID,
    clientSecret: serverEnv.META_APP_SECRET,
    clientIdParam: "client_id",
    usesPkce: false,
    authorizeParams: {},
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["pages_show_list", "pages_manage_posts", "pages_read_engagement"],
    clientId: serverEnv.META_APP_ID,
    clientSecret: serverEnv.META_APP_SECRET,
    clientIdParam: "client_id",
    usesPkce: false,
    authorizeParams: {},
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    clientId: serverEnv.GOOGLE_CLIENT_ID,
    clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    clientIdParam: "client_id",
    usesPkce: false,
    // Google only returns a refresh token when consent is forced and offline
    // access is asked for. Without both, a reconnect silently yields a token
    // that expires in an hour and cannot be renewed.
    authorizeParams: { access_type: "offline", prompt: "consent" },
  },
};

export function platformConfig(platform: SocialPlatform): PlatformConfig {
  return CONFIGS[platform];
}

/** A platform is usable only with both halves of its OAuth credentials. */
export function isPlatformConfigured(platform: SocialPlatform): boolean {
  const config = CONFIGS[platform];
  return config.clientId !== "" && config.clientSecret !== "";
}

export function configuredPlatforms(): readonly SocialPlatform[] {
  return SOCIAL_PLATFORMS.filter(isPlatformConfigured);
}

/** Redirect URI registered with each provider. Must match byte for byte. */
export function redirectUri(platform: SocialPlatform, appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/social/${platform}/callback`;
}
