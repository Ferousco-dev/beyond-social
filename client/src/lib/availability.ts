/**
 * Which routes the web app serves.
 *
 * The frontend only draws screens and sends requests; every credential and
 * every piece of business logic lives in the Go service. Any route not listed
 * here is refused by the middleware, so a stray old page cannot come back to
 * life with keys in the web app.
 *
 * Edge-safe: no Node imports, because the middleware reads it.
 */

/**
 * Dashboard pages that are served. `/dashboard/credits` and
 * `/dashboard/connections` are redirects kept for Stripe and sign-in returns
 * from earlier deploys. Anything else is unavailable.
 */
const ENABLED_DASHBOARD = new Set(["/dashboard", "/dashboard/trends", "/dashboard/assets", "/dashboard/unavailable", "/dashboard/credits", "/dashboard/connections", "/dashboard/schedule", "/dashboard/projects", "/dashboard/usage", "/dashboard/analytics"]);

/** The admin console runs entirely on the Go API, so all of it is available. */
const ADMIN_PREFIX = "/dashboard/admin";

/** API routes still served by the web app. All the others carried credentials. */
const ENABLED_API = new Set(["/api/health", "/api/ready", "/api/service-status"]);

export const UNAVAILABLE_PATH = "/dashboard/unavailable";

export type RouteAvailability = "available" | "page-unavailable" | "api-unavailable";

export function routeAvailability(pathname: string): RouteAvailability {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  if (path.startsWith("/api/")) return ENABLED_API.has(path) ? "available" : "api-unavailable";
  if (path.startsWith("/settings")) return "page-unavailable";
  if (path === "/editor" || path.startsWith("/editor/")) return "available";
  if (path.startsWith("/dashboard")) {
    if (ENABLED_DASHBOARD.has(path) || path.startsWith("/dashboard/settings")) return "available";
    if (path === ADMIN_PREFIX || path.startsWith(`${ADMIN_PREFIX}/`)) return "available";
    // The structured New Video flow and generation form.
    // guard-allow: links-to-real-pages (path prefixes, not links)
    if (path === "/dashboard/new" || path === "/dashboard/videos" || path.startsWith("/dashboard/videos/")) return "available";
    // Asset groups and their detail pages.
    if (path === "/dashboard/assets" || path.startsWith("/dashboard/assets/")) return "available";
    return "page-unavailable";
  }
  return "available";
}
