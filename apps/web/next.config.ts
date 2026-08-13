import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const isDev = process.env.NODE_ENV !== "production";

// Scoped Content-Security-Policy. Scripts still allow 'unsafe-inline' because
// the App Router injects inline bootstrap scripts without a nonce; tightening
// this to a nonce-based policy is tracked in docs/production-readiness.md.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  /*
   * The local stack serves storage over plain http on another port, so a signed
   * url for an uploaded photo or a rendered video is neither 'self' nor https:
   * and the browser drops it. It shows up as a broken thumbnail rather than as
   * an error, which reads like a failed upload.
   *
   * Only in development. Production storage is https and already covered.
   */
  `img-src 'self' data: blob: https:${isDev ? " http://127.0.0.1:54321" : ""}`,
  `media-src 'self' blob: https:${isDev ? " http://127.0.0.1:54321" : ""}`,
  "font-src 'self' data:",
  // The local Supabase stack is a development concern. Shipping it in the
  // production policy let any script on the page reach a service on the
  // visitor's own machine, which is a hole opened for our convenience and paid
  // for by them.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.kie.ai${
    isDev ? " http://127.0.0.1:54321 ws://127.0.0.1:54321" : ""
  }`,
  /*
   * The one iframe in the product is the Discover player, and there was no
   * frame-src at all, so it fell back to `default-src 'self'` and the browser
   * blocked every embed. The feed rendered its posters and then nothing
   * happened on a tap, which reads as a broken player rather than a policy.
   *
   * Named hosts rather than a wildcard: these are the two platforms the
   * scrapers cover, and the embed URLs are composed from validated ids.
   */
  "frame-src 'self' https://www.tiktok.com https://www.instagram.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The microphone is allowed for this origin only, because recording a voice
    // clip is a feature of the app. An empty list blocks every origin including
    // ours, so the browser refuses before it can even ask, and the failure
    // arrives as the same error a user denial would produce. Camera and
    // location stay closed: nothing here uses them.
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Next 15 caches dynamic segments on the client for 0 seconds by default, so
     * going back to a page you were just on refetches the whole thing. Thirty
     * seconds makes back, forward, and repeat navigation instant without letting
     * anyone read genuinely stale data for long.
     */
    staleTimes: { dynamic: 30, static: 180 },
  },
  reactStrictMode: true,
  poweredByHeader: false,
  // The env package ships as TypeScript source, so Next must transpile it.
  transpilePackages: [
    "@beyond-social/env",
    "@beyond-social/prompt-engine",
    "@beyond-social/ai-gateway",
  ],
  typedRoutes: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Marketing imagery is served from Unsplash's CDN.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Pin file tracing to the monorepo root; otherwise Next can infer the wrong
  // root when other lockfiles exist elsewhere on the machine.
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
