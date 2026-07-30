import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { type ReactNode } from "react";
import type { Metadata } from "next";

import { env } from "@/lib/env";
import { AUTO_THEME_SCRIPT, getTheme } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Beyond Social",
    template: "%s · Beyond Social",
  },
  description: "AI-powered social media video platform, from idea to published short-form video.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const theme = await getTheme();
  return (
    <html
      lang="en"
      // The class is decided on the server from the cookie, so the first paint
      // is already the right colours.
      className={`${GeistSans.variable} ${GeistMono.variable}${theme === "dark" ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <head>
        {/* Only `auto` needs a script: the explicit choices are already on the
            html element above. Runs before paint, so there is no flash. */}
        {theme === "auto" ? (
          <script dangerouslySetInnerHTML={{ __html: AUTO_THEME_SCRIPT }} />
        ) : null}
      </head>
      <body>
        {/*
          First focusable element on every page. Without it a keyboard or screen
          reader user has to walk the whole navigation to reach the content, on
          every navigation. It is visually hidden until focused.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-canvas focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
