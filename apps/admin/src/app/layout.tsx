import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { type ReactNode } from "react";
import type { Metadata, Viewport } from "next";

import "./globals.css";

/**
 * Applies the theme before first paint, reading the same cookie the web app
 * writes. Reading it on the server would opt every page out of static
 * rendering; a blocking script in <head> runs before the body paints, so there
 * is no flash either way.
 */
const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )bs-theme=([^;]*)/);var t=m?decodeURIComponent(m[1]):'light';if(t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Beyond Social Admin",
  },
  description: "Internal operations console for Beyond Social.",
  applicationName: "Beyond Social Admin",
  // Belt and braces with the X-Robots-Tag header: an internal console should
  // never show up in a search result.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
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
      </body>
    </html>
  );
}
