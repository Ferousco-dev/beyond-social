import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The env package ships as TypeScript source, so Next must transpile it.
  transpilePackages: ["@beyond-social/env"],
  typedRoutes: true,
  // Pin file tracing to the monorepo root; otherwise Next can infer the wrong
  // root when other lockfiles exist elsewhere on the machine.
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
