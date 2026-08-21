"use client";

import { type ComponentType, type SVGProps } from "react";

import { GitHubIcon, GoogleIcon } from "./brand-icons";

interface ProviderConfig {
  readonly provider: string;
  readonly label: string;
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Only the providers actually enabled in Supabase.
 *
 * Apple and Microsoft buttons used to sit here too. A button for a provider
 * that is not configured does not fail politely: it sends the user to an error
 * page or does nothing, which reads as a broken product rather than an absent
 * feature. Adding one back is a two-line change once its provider is enabled.
 */
const PROVIDERS: readonly ProviderConfig[] = [
  { provider: "google", label: "Google", Icon: GoogleIcon },
  { provider: "github", label: "GitHub", Icon: GitHubIcon },
];

export function SocialAuthButtons() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3">
        {PROVIDERS.map(({ provider, label, Icon }) => (
          <button
            key={provider}
            type="button"
            disabled
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium opacity-50 disabled:cursor-not-allowed"
          >
            <Icon className="size-4" aria-hidden />
            Continue with {label}
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              Soon
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
