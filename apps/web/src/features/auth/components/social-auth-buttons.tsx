"use client";

import { type Provider } from "@supabase/supabase-js";
import { type ComponentType, type SVGProps, useState } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

import { AppleIcon, GitHubIcon, GoogleIcon, MicrosoftIcon } from "./brand-icons";

interface ProviderConfig {
  readonly provider: Provider;
  readonly label: string;
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const PROVIDERS: readonly ProviderConfig[] = [
  { provider: "google", label: "Google", Icon: GoogleIcon },
  { provider: "apple", label: "Apple", Icon: AppleIcon },
  { provider: "github", label: "GitHub", Icon: GitHubIcon },
  { provider: "azure", label: "Microsoft", Icon: MicrosoftIcon },
];

export function SocialAuthButtons() {
  const [pending, setPending] = useState<Provider | null>(null);

  async function handleSignIn(provider: Provider) {
    if (!isSupabaseConfigured) return;
    setPending(provider);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {PROVIDERS.map(({ provider, label, Icon }) => (
        <button
          key={provider}
          type="button"
          onClick={() => void handleSignIn(provider)}
          disabled={pending !== null}
          aria-label={`Continue with ${label}`}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
