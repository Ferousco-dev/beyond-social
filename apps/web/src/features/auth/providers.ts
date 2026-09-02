/**
 * Which social sign-in buttons appear, and what they are called.
 *
 * Driven entirely by `NEXT_PUBLIC_AUTH_PROVIDERS`, so turning a provider on or
 * off is an environment change rather than a code change. An unknown name in
 * that list is ignored rather than throwing: a typo should cost one button, not
 * the whole sign-in page.
 *
 * Nothing here mentions a domain. The redirect is built from the origin the
 * browser is actually on, so this works unchanged on localhost, on a preview
 * deployment, and on whatever real domain arrives later. Moving domain means
 * updating two consoles, never this file:
 *
 *   1. The provider's own console, which points at Supabase rather than at us
 *      (see `docs/oauth.md`), so for Google, GitHub and Facebook it does not
 *      change at all when our domain does.
 *   2. Supabase Auth's redirect allowlist, which does need the new origin.
 */
import { type ComponentType, type SVGProps } from "react";

import { FacebookIcon, GitHubIcon, GoogleIcon } from "./components/brand-icons";
import { env } from "@/lib/env";

/**
 * The providers Supabase Auth can actually complete a sign-in with. TikTok is
 * deliberately absent: Supabase has no TikTok auth provider, so a button for it
 * could only fail. TikTok is connected inside the app after sign-in, through
 * the publishing flow in `lib/social`, which is a different thing entirely.
 */
export const SUPPORTED_PROVIDERS = ["google", "github", "facebook"] as const;
export type AuthProvider = (typeof SUPPORTED_PROVIDERS)[number];

export interface ProviderPresentation {
  readonly id: AuthProvider;
  /** Shown on the button, after "Continue with". */
  readonly label: string;
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const PRESENTATION: Readonly<Record<AuthProvider, ProviderPresentation>> = {
  google: { id: "google", label: "Google", Icon: GoogleIcon },
  github: { id: "github", label: "GitHub", Icon: GitHubIcon },
  facebook: { id: "facebook", label: "Facebook", Icon: FacebookIcon },
};

/** The providers this deployment offers, in the order they were configured. */
export function enabledProviders(): readonly ProviderPresentation[] {
  const configured = env.NEXT_PUBLIC_AUTH_PROVIDERS.split(",")
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name !== "");

  const seen = new Set<string>();
  const providers: ProviderPresentation[] = [];
  for (const name of configured) {
    if (seen.has(name)) continue;
    seen.add(name);
    const supported = SUPPORTED_PROVIDERS.find((id) => id === name);
    if (supported) providers.push(PRESENTATION[supported]);
  }
  return providers;
}
