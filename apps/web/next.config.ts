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
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.kie.ai http://127.0.0.1:54321 ws://127.0.0.1:54321",
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
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
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
