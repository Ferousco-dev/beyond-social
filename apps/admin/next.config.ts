import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const isDev = process.env.NODE_ENV !== "production";

// Scoped Content-Security-Policy, tighter than the web app's: the admin console
// loads no third-party media and talks to nothing but Supabase, so images and
// connections are not opened up to arbitrary https origins. Scripts still allow
// 'unsafe-inline' because the App Router injects inline bootstrap scripts
// without a nonce.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  // The local Supabase stack is a development concern and must not appear in
  // the production policy, where it would let any script on the page reach a
  // service on the visitor's own machine.
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${
    isDev ? " http://127.0.0.1:54321 ws://127.0.0.1:54321" : ""
  }`,
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
  // An internal console has nothing to gain from being indexed, and a crawled
  // login page is a free map of the surface for anyone probing it.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Off until the console has its route tree. Typed routes reject any link or
  // redirect to a page that does not exist yet, including the root redirect to
  // /overview. Turn this on (as apps/web has it) once the sections land.
  typedRoutes: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Pin file tracing to the monorepo root; otherwise Next can infer the wrong
  // root when other lockfiles exist elsewhere on the machine.
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
