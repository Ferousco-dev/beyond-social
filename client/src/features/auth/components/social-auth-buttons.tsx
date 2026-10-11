"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { enabledProviders, type AuthProvider } from "../providers";

/**
 * Signing in with an account somebody already has.
 *
 * These buttons were disabled placeholders wearing a "Soon" pill. They work
 * now, and which ones exist comes from `NEXT_PUBLIC_AUTH_PROVIDERS` rather than
 * from a list in this file, so enabling a provider is an environment change.
 * The old comment here was right about the reason: a button for a provider that
 * is not configured does not fail politely, it sends somebody to an error page,
 * which reads as a broken product rather than an absent feature.
 *
 * The redirect is built from `window.location.origin`, never from a configured
 * URL, so this follows the app onto whatever domain serves it with no change
 * here and none to the environment. See docs/oauth.md.
 */
export function SocialAuthButtons() {
  const providers = enabledProviders();
  const [busy, setBusy] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) return null;

  const start = async (provider: AuthProvider): Promise<void> => {
    setBusy(provider);
    setError(null);
    try {
      const { error: failed } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      // A success navigates away, so arriving here means it did not.
      if (failed) throw new Error(failed.message);
    } catch (caught) {
      setBusy(null);
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : "That sign-in could not be started.",
      );
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3">
        {providers.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            disabled={busy !== null}
            onClick={() => void start(id)}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon className="size-4" aria-hidden />
            {busy === id ? "Redirecting" : `Continue with ${label}`}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
