# Beyond Social — Build Progress

Source of truth: `BEYOND SOCIAL — FULL PROJECT REQUIREMENTS` (PDF, 9 sections).
Stack (confirmed): Next.js + TypeScript frontend, Go backend, Supabase Postgres,
Supabase Storage, Go worker pools, Stripe billing. No PayNow for v1.
Chat-first creation is retired; structured forms are the interface.

## Credit policy (server-side, verified)

- Append-only `credit_ledger` + `credit_balances` (migration `011_credits.sql`).
- Prices per action in `action_prices`: video generation 4 credits/second
  ($0.07/s KIE), talking photo 4 credits/s, speech 2 credits/1000 chars,
  image edit 2 credits, editor watch 5 credits.
- Signup grant 25 credits, daily cap 1000 credits (`012_credit_settings.sql`).
- Reserve/settle/refund flow with background sweeper; failure refunds exist.
- Credit packs + payments + Stripe webhook in `028_billing.sql`.
- Missing: `expire` ledger path (kind allowed, no producer).

## Milestones

- [ ] M1 — Foundation verification (backend covers Section 9; this file; env docs)
- [ ] M2 — Public website + billing (blog read + CMS, signup business fields, activation page)
- [ ] M3 — Dashboard revamp (New Video, projects wording, sections, retire chat entry points)
- [ ] M4 — New Video 3-option flow (frontend entry and idea/reference paths; result split and regional filter unavailable)
- [x] M5 — 5-step generation form A–E (credit estimate, confirm, progress, autosave)
- [x] M6 — Schedule calendar + publishing statuses (frontend; edit/reschedule API missing)
- [ ] M7 — Analytics views + learning (backend collector missing)
- [ ] M8 — Admin gaps (suspend route, profit view, blog CMS, monitoring page)
- [ ] M9 — Hardening (backups missing, README exists, rate limits exist)

## Backend gaps for later milestones

- Asset library tables (face/voice/product/background) with rename/replace/delete.
- Admin suspend/restore route (schema enforced, no route).
- Analytics collector + posting-time recommender.
- Blog backend (posts table + API).
- Subscription lifecycle audit rows.
- Backups.

## Log

- M1 started: verified Go build + client typecheck green on pulled branch.
- M1 done: PROGRESS.md created, foundation verified, credit policy reported, env docs audited.
- M2 started: blog backend built (035_blog_posts, internal/blog, store, 7 routes, tests green on real PG).
- Blog frontend wired: public list + detail with SEO metadata, admin CMS (list/new/edit, SEO fields), nav link.
- M2 done: signup business fields, welcome activation page, Stripe return URLs moved to it.
- M3 started: New Video button, projects wording, chat copy retired (routes live until M4).
- M3 done: sidebar, palette, and empty states use project wording.
- M4 frontend added: `/dashboard/new` offers trending search, public-link analysis, and an own-idea brief. The current search API has no regional filter or human/product classification; link analysis returns editable notes, not an analysis/script-approval API.
- M5 frontend done locally: five-step video setup, browser draft autosave, server credit quote, confirmation, job progress, and Library save; current generator outputs one scene and does not attach saved media.
- M6 frontend progress: calendar view, publishing statuses, confirmed cancellation, and Library scheduling with title/caption/visibility/time added. Editing/rescheduling remain blocked on missing API operations.
- Assets frontend added: categorized upload/preview flow and browser-local naming/list; remote listing/deletion and cross-device metadata remain blocked on missing media APIs.
- M7 frontend progress: Analytics route added with a clear unavailable state. Published-video metrics and account-specific recommendations remain blocked on the missing analytics collector/API.
- M8 frontend progress: admin Monitoring view uses recorded credit-usage/provider-cost data. Blog CMS, account suspension, job monitoring, and full profit reporting remain backend-dependent.
- M9 frontend verification: changed client passes typecheck, lint, route type generation, production build, and 42 existing client tests. Backups remain an infrastructure task.
