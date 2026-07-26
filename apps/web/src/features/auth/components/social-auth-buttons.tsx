"use client";

import { type Provider } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { type ComponentType, type SVGProps, useState } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

import { GitHubIcon, GoogleIcon } from "./brand-icons";

interface ProviderConfig {
  readonly provider: Provider;
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

/** Only same-origin paths, so `?redirect=` cannot be pointed off-site. */
function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/")) return "/dashboard";
  // Reject protocol-relative and backslash forms before they reach a URL parser.
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  return value;
}

export function SocialAuthButtons() {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(provider: Provider) {
    if (!isSupabaseConfigured) {
      setError("Sign-in is not connected yet.");
      return;
    }

    setPending(provider);
    setError(null);

    // Read at click time rather than with useSearchParams, which would opt the
    // whole login page out of static rendering for a value only needed here.
    const next = safeRedirect(new URLSearchParams(window.location.search).get("redirect"));
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirect", next);

    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });

    // On success the browser navigates away, so reaching here means it failed.
    // Without this the button stayed disabled forever with no explanation.
    if (oauthError) {
      setPending(null);
      setError("Could not start that sign-in. Please try again.");
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROVIDERS.map(({ provider, label, Icon }) => (
          <button
            key={provider}
            type="button"
            onClick={() => void handleSignIn(provider)}
            disabled={pending !== null}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === provider ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Icon className="size-4" aria-hidden />
            )}
            Continue with {label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
