# Ìlànà Ledger: beyond-social

Append-only. Newest at the bottom. See `kernel/ledger-spec.md` for the rules.

---

## 2026-08-29 | BOOT | conductor

Cold start. No prior `.ilana/`. User asked, informally: list all the pipelines, then debug
and clean up code, then list what's undone.

Fork offered: FLEET vs TASK vs AUDIT/TUTOR/DOCTOR/DRILL. User chose **AUDIT then TASK**.

Existing-project intake run per `interrogation/intake.md`: read the repo (`git log`,
branches, tags, CI workflows, `docs/`) before asking anything. This is a mature production
monorepo (Next.js web + worker + admin, Supabase, kie.ai video generation, Stripe billing,
BullMQ publish worker, Fly render worker, Telegram remote-agent), 382 commits, real CI/CD.

DEC-001: Rigour 3 (production SaaS, card data offloaded to Stripe, not yet regulated
scale). Stated aloud, not confirmed by the user this pass — will adjust if corrected.

## 2026-08-29 | G0 | quality-auditor | GATE PASS (indicative, AUDIT mode)

Evidence gathered per `modes/audit.md`'s table, all 11 phases, commands run and cited in
`docs/ilana-audit.md`. Full report: `docs/ilana-audit.md`.

Scorecard mean: 2.55 → indicative Level 3 Defined (partial).

Findings logged:

- DEF-001 [critical, fixed same session] CI red on `main` for 4 pushes, format-check.
  Fixed: commit `373efaa`. Re-ran CI: green, including `Deploy production: success`.
- DEF-002 [high, process] Manual `vercel deploy --prod` run 3x this session, redundant
  with `ci.yml`'s own automatic `deploy-production` job (confirmed working, just ran
  successfully on its own after DEF-001's fix).
- DEF-003 [high, standing] No observability (Sentry/APM). Unchanged from
  `docs/production-readiness.md`'s own C3.
- DEF-004 [medium] No `LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- DEF-005 [medium] No git tags ever cut; 90+ stale branches.
- (Additional medium/low findings recorded in the report, not separately IDed: apps/admin
  undeployed, apps/worker and services/render unverified from this environment, and the
  unchanged H1/H2/H3/L4 items from production-readiness.md.)

Decision: hand the report to the user. Do not proceed to remediation work (TASK mode)
without the user picking what to work on next — Article 16, the human is in command, and
the remediation plan in the report is a proposal, not a queue Ìlànà will silently start
executing.

## 2026-08-29 | TASK | constructor | REMEDIATION (ad hoc, before full report handoff)

DEF-001 was fixed inline during evidence-gathering rather than held for a separate TASK
round: it was actively breaking the deploy pipeline while the audit was being written, and
Article 6 (process adherence is not optional) argues against leaving a known-broken `main`
sitting red for the length of a full audit write-up. Logged here for traceability; this is
the one deviation from "audit changes nothing" in this run, and it is a same-effect, no-risk
formatting fix, not a design decision made on the user's behalf.

## 2026-08-29 | TASK | constructor | User selected findings to act on

User response to the G0 handoff: use Firebase instead of Sentry for DEF-003 (own choice, not
Ìlànà's recommendation — flagged the mismatch: Firebase has no first-party server-side error
tracking/alerting product for a Vercel-hosted Next.js app; Crashlytics is mobile-only. User
confirmed proceeding anyway, scoped to "error tracking too" alongside analytics). Deploy
`apps/admin` (DEF-006 in the report). Add LICENSE/SECURITY.md/CODE_OF_CONDUCT.md (DEF-004).
Worker deployment (F-07) declined — user is handling it themselves, out of scope here.

Work done, in order:

- DEF-004 closed: `LICENSE` (proprietary, matches every package.json's existing
  `"license": "UNLICENSED"`), `SECURITY.md` (routes to GitHub private security advisories,
  no email needed), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1). Commit `ca8f1b2`.
- `apps/admin` deployed: new Vercel project `beyond-social-admin`, root directory set via
  API (CLI cannot set it, same limitation as the web app's original setup), 4 env vars
  (reused the app's existing Supabase project — no new backend). Live at
  https://beyond-social-admin.vercel.app. Verified: `/` and `/users` redirect
  unauthenticated (307), `/sign-in` renders (200). Access is DB-gated
  (`profiles.role = 'admin'`); nobody can sign in until the owner sets their own row.
  Not a DEF in the register (was F-06 in the narrative report, informational).
- Firebase: new project `beyond-social-app` (project id, since `beyond-social` was taken
  globally), one Web app registered, SDK config pulled. `NEXT_PUBLIC_FIREBASE_*` vars
  (6 of 7; `MEASUREMENT_ID` intentionally empty) added to `.env.local` and Vercel
  (production + preview) for the `beyond-social` project.
  Built: `lib/firebase/client.ts` (lazy analytics init, no-ops without configured),
  `lib/firebase/report-error.ts` (console + Analytics `exception` event),
  `components/analytics/firebase-observability.tsx` (window error/rejection listener +
  route-change page views), wired into `error.tsx`, `global-error.tsx`, and root layout.
  CSP `connect-src` widened for the Google Analytics/Firebase domains this needs.
  Commit `20a5d7d`.
- **Open, needs the owner**: Google Analytics must be linked to the `beyond-social-app`
  Firebase project from https://console.firebase.google.com — the CLI has no command for
  it. Until `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is set (Vercel env, both environments),
  every `track()`/`reportError()` call is a safe no-op; nothing breaks, nothing is
  collected either.
- DEF-003 stays open by design: this closes client-side crash visibility only. Server
  actions, edge functions, and the worker remain unobserved. Correcting the earlier
  process mistake (DEF-002): pushed both commits to `main` and let `ci.yml`'s own
  `deploy-production` job deploy, did not run `vercel deploy` manually this round.
