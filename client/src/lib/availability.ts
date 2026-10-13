/**
 * Which parts of the product are served by the Go API yet.
 *
 * The app is being rebuilt so that the frontend only draws screens and sends
 * requests, while every credential and every piece of business logic lives in
 * the Go service. Features that have not moved yet are switched off here, in one
 * place, rather than left half-working with keys sitting in the web app. The
 * middleware refuses their routes, and the few that live inside an enabled
 * screen check the flag themselves.
 *
 * Edge-safe: no Node imports, because the middleware reads it.
 */

/** Dashboard pages that run on the Go API today. Anything else is unavailable. */
const ENABLED_DASHBOARD = new Set(["/dashboard", "/dashboard/trends", "/dashboard/assets", "/dashboard/avatar", "/dashboard/avatar/new", "/dashboard/unavailable", "/dashboard/credits", "/dashboard/connections", "/dashboard/schedule", "/dashboard/library", "/dashboard/usage"]);

/** The admin console runs entirely on the Go API, so all of it is available. */
const ADMIN_PREFIX = "/dashboard/admin";

/** API routes still served by the web app. All the others carried credentials. */
const ENABLED_API = new Set(["/api/health", "/api/ready"]);

export const UNAVAILABLE_PATH = "/dashboard/unavailable";

export type RouteAvailability = "available" | "page-unavailable" | "api-unavailable";

export function routeAvailability(pathname: string): RouteAvailability {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  if (path.startsWith("/api/")) return ENABLED_API.has(path) ? "available" : "api-unavailable";
  if (path.startsWith("/settings")) return "page-unavailable";
  if (path.startsWith("/dashboard")) {
    if (ENABLED_DASHBOARD.has(path) || path.startsWith("/dashboard/settings")) return "available";
    if (path === ADMIN_PREFIX || path.startsWith(`${ADMIN_PREFIX}/`)) return "available";
    // The combined project workspace (canvas + chat) runs here now.
    if (path === "/dashboard/c" || path.startsWith("/dashboard/c/")) return "available";
    return "page-unavailable";
  }
  return "available";
}

/** Features inside enabled screens that still depend on the old in-app server logic. */
export const FEATURES = {
  /** "Use as inspiration" and the deep analysis, which need AI and credits. */
  postAnalysis: false,
} as const;
