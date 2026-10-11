/**
 * Stand-in for the `server-only` marker package.
 *
 * Next aliases `server-only` inside its own bundler, so it is never installed
 * and cannot resolve in plain Node. Mapping it here through tsconfig paths is
 * what lets server modules be unit-tested outside a Next build without adding a
 * dependency the app does not otherwise need.
 */
export {};
