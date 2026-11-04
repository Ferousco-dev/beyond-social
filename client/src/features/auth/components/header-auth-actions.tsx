"use client";

import { type Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * The header's account actions.
 *
 * Resolved on the client rather than on the server, deliberately. The landing
 * page is statically rendered, and reading the session during render would make
 * every visit dynamic to change two links on the most-visited page in the
 * product. `getSession` reads the existing cookie without a network round trip,
 * so the swap happens almost immediately.
 *
 * The cost is one frame where the state is unknown. That frame renders a
 * fixed-width placeholder rather than the signed-out links, because guessing
 * wrong and then correcting is what produces the flash of "Sign in" that a
 * signed-in user notices.
 *
 * This is not a security boundary. A signed-out visitor who somehow saw the
 * dashboard link would still be redirected by the middleware.
 */

type AuthState = "unknown" | "signed-in" | "signed-out";

export function HeaderAuthActions({
  compact = false,
  /** The mobile sheet stacks full-width buttons instead of inline links. */
  stacked = false,
  /** Closes the mobile sheet when a link is followed. */
  onNavigate,
}: {
  compact?: boolean;
  stacked?: boolean;
  onNavigate?: () => void;
}) {
  const [state, setState] = useState<AuthState>(
    // Without a backend there is no session to have, so there is nothing to
    // resolve and no reason to show a placeholder.
    isSupabaseConfigured ? "unknown" : "signed-out",
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState(data.session ? "signed-in" : "signed-out");
    });

    // Keeps the header honest if the user signs out in another tab.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(session ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const primary = stacked
    ? "rounded-full bg-ink px-4 py-2.5 text-center text-sm font-medium text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    : "rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  if (state === "unknown") {
    // Holds the space the resolved links will occupy, so nothing shifts when
    // they arrive.
    return <span aria-hidden className={stacked ? "h-[5.75rem]" : "h-9 w-[8.5rem]"} />;
  }

  if (state === "signed-in") {
    return (
      <Link href={"/dashboard" as Route} onClick={onNavigate} className={primary}>
        Open dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        onClick={onNavigate}
        className={cn(
          stacked
            ? "rounded-full border border-hairline px-4 py-2.5 text-center text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            : "rounded-full px-3.5 py-2 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          !stacked && compact && "hidden lg:inline-flex",
        )}
      >
        Sign in
      </Link>
      <Link href="/signup" onClick={onNavigate} className={primary}>
        Start free
      </Link>
    </>
  );
}
