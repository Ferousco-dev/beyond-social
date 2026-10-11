"use client";

import dynamic from "next/dynamic";
import { type ReactNode } from "react";

/**
 * The header's account actions, loaded after the page is interactive.
 *
 * This exists for one measured reason. Resolving the session needs the Supabase
 * client, and importing it directly put roughly 100 kB into the first load of
 * every statically rendered page, including ones with no account controls in
 * them at all: /terms and /privacy were the same weight as the landing page.
 *
 * Splitting it costs nothing visually. The component already renders a
 * fixed-width placeholder for the frame before the session resolves, so the
 * loading state here is the same placeholder it would have shown anyway, and
 * nothing shifts when the real links arrive.
 *
 * `ssr: false` because the resolved state is client-only regardless: the
 * markup is static and the session is read from the cookie in the browser.
 */

function Placeholder({ stacked }: { stacked?: boolean }): ReactNode {
  return <span aria-hidden className={stacked ? "h-[5.75rem]" : "h-9 w-[8.5rem]"} />;
}

export const HeaderAuthActions = dynamic(
  () => import("./header-auth-actions").then((module) => module.HeaderAuthActions),
  {
    ssr: false,
    loading: () => <Placeholder />,
  },
);
