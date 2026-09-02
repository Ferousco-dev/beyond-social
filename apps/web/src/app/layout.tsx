import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { type ReactNode } from "react";
import type { Metadata, Viewport } from "next";

import { FirebaseObservability } from "@/components/analytics/firebase-observability";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { env } from "@/lib/env";
import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Beyond Social",
    template: "%s · Beyond Social",
  },
  description: "AI-powered social media video platform, from idea to published short-form video.",
  applicationName: "Beyond Social",
  appleWebApp: {
    // iOS has no manifest support worth relying on, so standalone mode and the
    // home-screen title are declared separately here.
    capable: true,
    title: "Beyond",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // Without these a pasted link renders as a bare grey URL, which reads as a
  // link somebody is not sure about. The image itself is drawn per route by the
  // nearest `opengraph-image` file; this is what tells readers to look for one.
  openGraph: {
    type: "website",
    siteName: "Beyond Social",
    title: "Beyond Social",
    description: "AI-powered social media video platform, from idea to published short-form video.",
    url: env.NEXT_PUBLIC_APP_URL,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beyond Social",
    description: "AI-powered social media video platform, from idea to published short-form video.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the app paint under the notch and the home indicator. Every fixed edge
  // in the app pads itself with env(safe-area-inset-*) to compensate.
  viewportFit: "cover",
  // The one place the theme has to be inferred rather than read: a status bar
  // colour cannot be set from our cookie, only from the system preference. A
  // visitor who picks dark on a light phone gets a light status bar, which is
  // the smallest available mismatch.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0e" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Before paint, so there is no flash. Deliberately not read with
            `cookies()`: that would make every page in the app dynamic. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
        <ServiceWorker />
        <FirebaseObservability />
      </body>
    </html>
  );
}
