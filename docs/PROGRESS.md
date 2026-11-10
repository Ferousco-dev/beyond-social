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
- [ ] M4 — New Video 3-option flow (trending w/ industry+country+split, paste link, own idea)
- [ ] M5 — 5-step generation form A–E (credit estimate, confirm, progress, autosave)
- [ ] M6 — Schedule calendar + publishing statuses (backend exists)
- [ ] M7 — Analytics views + learning (backend collector missing)
- [x] M8: Admin gaps (suspend route, profit view, blog CMS, monitoring page)
- [ ] M9: Hardening (backups missing, README exists, rate limits exist)

## Backend gaps for later milestones

- Asset library tables (face/voice/product/background) with rename/replace/delete.
- Analytics collector + posting-time recommender.
- Blog backend (posts table + API).
- Backups.

## Log

- M1 started: verified Go build + client typecheck green on pulled branch.
- M1 done: PROGRESS.md created, foundation verified, credit policy reported, env docs audited.
- M2 started: blog backend built (035_blog_posts, internal/blog, store, 7 routes, tests green on real PG).
- Blog frontend wired: public list + detail with SEO metadata, admin CMS (list/new/edit, SEO fields), nav link.
- M2 done: signup business fields, welcome activation page, Stripe return URLs moved to it.
- M3 started: New Video button, projects wording, chat copy retired (routes live until M4).
- M3 done: sidebar, palette, and empty states use project wording.
- M4 done: /dashboard/new 3-option flow, trending with split, link analysis, script approval, analyses API.
- M5 done: 5-step generation form with quote, confirm, progress, email opt-in; new scenes fields and completion mail endpoints.
- M6 done: schedule calendar, reschedule inline, PUT posts route; API restarted with it.
- M7 done: post_metrics table, YouTube collector, slots recommender, analytics page, best-time hints.
- M5b started: ElevenLabs client + vault key + setup checklist + admin docs done.
- M5b backend: asset groups API, voice cloning API with group consent gate.
- M5b voices switched HeyGen to ElevenLabs; full Go suite green.
- M5b frontend: groups pages, Live Avatar step flow, production build green.
- M8 done: admin suspend/restore route, combined profit view with cost data, monitoring snapshot endpoint and dashboard page.
