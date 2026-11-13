# Performance pass (13 Nov 2026)

Branch `perf/speed-pass`. The brief's 13 workspaces, Cloudflare/R2 and AI-response caching do not exist in this repo (see audit/RECON.md); this covers what does.

## Baseline (production build, Next 15.5.29, local)
- Build: 34 s wall. Shared first-load JS 103 kB. Middleware 116 kB.
- Heaviest routes (first-load JS): /editor/[id] 312 kB, /signup 280, /dashboard/new 265, /login 248, /forgot-password 246, /reset-password 244, /dashboard/assets 232, /dashboard/trends 222. Marketing pages 126-129 kB.
- Largest chunk 1573 (456 kB raw) is the zod bundle, loaded by the four auth pages.
- Not measured (no runtime profiling environment, no production access): TTFB, LCP, INP, CLS, API latency, query timings.

## Fix made: production build was failing (P1)
- Problem: `pnpm build` failed with `Can't resolve 'zod/v4/core'` from `@hookform/resolvers/zod`. The package declares no zod peer and pnpm's strict layout does not hoist our direct zod to it. Reproduced on a clean `--frozen-lockfile` install.
- Not verified: whether Vercel's own build hits this. CI (typecheck, lint, test) never runs `next build`, so a broken build would not be caught before deploy.
- Fix: `client/next.config.ts` aliases `zod/v4/core` to the zod the app already depends on. A `packageExtensions` entry in pnpm-workspace.yaml was tried first and pnpm did not apply it, so it was reverted.
- After: build succeeds (numbers above are from the fixed build). Typecheck, lint and 76 tests pass.
- Recommended: add `next build` to CI so this class of failure is caught.

## Tried and rejected (measured)
Moving auth schemas to `zod/mini` kept all 30 parity cases identical but saved only 8 kB on /login (248 to 240) and made /editor/[id] (312 to 315) and /dashboard/new (265 to 269) larger because those routes then ship both zod builds. Reverted. The parity test was kept as `client/src/features/auth/schemas.test.ts` (4 tests; the suite is now 76).

## Reviewed, already sound (no change)
- Frontend: studio panels, export dialog and inspector are dynamically imported; mediabunny is imported lazily; `getCurrentUser`, `getAuthUser`, `getSidebarProjects` use React `cache`; dashboard layout starts its request early; pages fetch with `Promise.all`; `staleTimes` is set; images use avif/webp.
- API: list endpoints are paginated or capped; ETag/304 with `private, no-cache` for per-user reads and `public, max-age=60, stale-while-revalidate=300` only on identical-for-everyone reads (`internal/http/etag.go`).
- Database: user-scoped list and idempotency lookups all have supporting indexes (jobs, scheduled_posts, editor_projects, memories).

## Remaining / needs data or approval
- Collect real Web Vitals and API timings (Vercel Speed Insights or similar) before further frontend work; static analysis found no clear hot spot.
- Auth pages still ship ~120 kB gz of zod; a real fix is to move all client-bundled schemas to one zod flavour, which is larger than this pass.
- The Go API sets no compression itself; confirm Render's edge compresses JSON responses.
- `jobs_status_idx (status)` is low-selectivity and may cost more on writes than it saves; check with `pg_stat_user_indexes` on production before dropping.
- Only the files in the brief's list that had content are written; the other ten deliverable files were not created to avoid empty placeholders.

## Corrections and follow-up (13 Nov 2026)

Two earlier statements in this audit were wrong and are corrected here.
- "Jobs have no automatic retries": wrong. Transform, analysis, discovery and publish processors already retry with exponential backoff (10s doubling, 3 attempts; discovery 4), poll for at most 30 minutes, and deliberately do NOT retry an ambiguous KIE submit because it could bill twice. No retry code was added.
- "kie.ai spend is untracked": partly wrong. Real KIE/Apify spend is already read from provider balance snapshots every 15 minutes and shown on the admin Revenue page. The per-action estimate there only counts credit-ledger reservations, so Pro members' jobs (which spend usage points, not credits) were missing from it.

Added: migration 047 `provider_spend` (one row per completed job, all plans, estimated from `action_prices`), a recorder hooked into job completion that shares one pricing function with charging, and an admin page `/dashboard/admin/spend` (cost by provider, action and top-ten people, plus Gemini token use by model and by day). Costs on that page are estimates; the Revenue page remains the real bill. Recording starts with this release; earlier jobs are not backfilled.
