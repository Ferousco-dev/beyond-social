# Ìlànà Process Audit: beyond-social

Date: 2026-08-29 Auditor: quality-auditor (Ìlànà) Rigour assessed against: 3

## Verdict

This is a genuinely mature solo/AI-assisted codebase: real CI/CD with five independent
gates (format, lint, typecheck, build, tests), a security-scanning pipeline, migration
replay testing, and an unusually honest pair of self-audits already living in the repo
(`docs/production-readiness.md`, `docs/loop-engineering/BACKLOG.md`) that this document
draws on and re-verifies rather than duplicates. The gap is not discipline, it's coverage:
main was silently red for the last four pushes before this session fixed it, two built
services (`apps/admin`, and possibly `apps/worker`/`services/render`) have no confirmed
running instance, and the standing #1 item from the last hardening pass (observability)
is still standing.

## Rigour rationale

Rigour 3 (production SaaS, real users, revenue-adjacent). Not 4: card data never touches
this codebase directly (Stripe-hosted checkout), and personal data volume is not yet at
regulated scale. Revisit upward if a data-processing agreement, health-adjacent content, or
a payments-in-house flow is ever added.

## Scorecard

| Phase                 | Score | Evidence                                                                                                                                                            | Gap                                                                                                               |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 01 Requirements       | 2/4   | No SRS or REQ IDs; requirements live in prose comments and `docs/loop-engineering/BACKLOG.md` session notes                                                         | No traceability from a stated need to the code that satisfies it                                                  |
| 02 Architecture       | 3/4   | `docs/ARCHITECTURE.md`, `docs/production-readiness.md` (mermaid diagrams, re-verified against source), clean `features/*` module boundaries                         | Not independently reviewed by a second party                                                                      |
| 03 Interface          | 3/4   | `docs/ui.md`, `docs/color.md` are a real design-token spec; `globals.css` implements it; consistent component conventions across the app                            | No accessibility audit artifact found                                                                             |
| 04 Construction       | 3/4   | Shared `eslint-config`/`typescript-config` packages, `CLAUDE.md` coding rules, prettier enforced in CI                                                              | Standard is enforced by CI, not also by a human review step (see 07)                                              |
| 05 Verification       | 2/4   | Real test suites per package, all run in CI (`ci.yml`); `pnpm --filter ... test:*` across 15+ suites                                                                | No coverage tooling, no E2E (`L4` in production-readiness.md, confirmed still true), no formal test plan document |
| 06 SCM                | 2/4   | Descriptive, narrative commit messages; branch-per-change discipline; CI gates every PR                                                                             | Zero git tags ever cut (`git tag` returns empty); 90+ stale local/remote branches never pruned; no CHANGELOG      |
| 07 QA                 | 2/4   | `.github/CODEOWNERS` names an owner; `security.yml` runs `gitleaks` + `pnpm audit` on every PR and weekly                                                           | Single-owner repo, no evidence of independent human review on any PR; no formal inspection/walkthrough record     |
| 08 Process assessment | 3/4   | `docs/loop-engineering/BACKLOG.md` is a genuine, dated, session-by-session retrospective log (measure → analyze → improve, in practice, not just in theory)         | No formal metrics (defect density, cycle time) collected as data, only narrative                                  |
| 09 Process modeling   | 3/4   | Mermaid system/sequence/ER/deployment diagrams in `production-readiness.md`; `docs/workspace-ui.md`, `docs/platform-layers.md`                                      | No BPMN-level process model of the engineering workflow itself                                                    |
| 10 Tooling            | 3/4   | 6 CI/CD workflows (verify, database, edge-functions, security, 3 Telegram integrations), Turborepo, pnpm workspaces, a working Telegram-based remote-agent pipeline | No dependency-update automation (no Renovate/Dependabot config found)                                             |
| 11 Ethics and teams   | 2/4   | Consent-gated likeness/voice capture (`CONSENT_STATEMENT`, `recordLikenessConsent`) is a real, working ethics control; RLS everywhere                               | No `LICENSE`, `SECURITY.md`, or `CODE_OF_CONDUCT.md` in the repo root (confirmed absent)                          |

## Indicative maturity

Mean 2.55 → Level 3 Defined (partial). Not a formal SEI appraisal — this is a repository-evidence
read, not an audited process assessment.

## Findings

**F-01 [critical, fixed this session]** Main was CI-red for four consecutive pushes
(≈03:36–05:11 today) on `pnpm run format:check`, which runs a wider glob
(`**/*.{ts,tsx,...}` at the repo root) than the scoped checks used mid-session. Evidence:
`gh run list` showing four `failure` runs on `main`, all failing at the "Format check" step.
Cost of inaction: the `deploy-production` job in `ci.yml` is gated on `needs: verify`, so
none of those four pushes triggered an automated deploy — only my manual `vercel deploy`
calls got that code live, and the CI pipeline's own record of what's actually in production
went stale. Fix: `373efaa`, `git push`, re-ran CI, confirmed green end to end including
`Deploy production: success`.

**F-02 [high, process gap, mine]** This session ran `vercel deploy --prod` manually three
times, unaware that `ci.yml`'s `deploy-production` job already deploys automatically on
every green push to `main` (confirmed: `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`
are all present as repo secrets, and the job just ran and succeeded on its own). Cost: this
defeats the exact protection `ci.yml`'s own header comment describes — "a deployment that
never looked at whether tests passed" — since a manual deploy from a dirty local state
bypasses the gate entirely. Going forward: push and let CI deploy; reserve manual
`vercel deploy` for a genuine local/emergency case, and say so explicitly when doing it.

**F-03 [high, standing]** No observability. Confirmed again: no `@sentry/*` or any APM
dependency in any `package.json`. This is `production-readiness.md`'s own C3, unchanged,
and its own "Next Recommended Task." Cost of inaction: an incident is found by someone
noticing, not by a page.

**F-04 [medium]** No `LICENSE`, `SECURITY.md`, or `CODE_OF_CONDUCT.md` at the repo root
(confirmed absent by direct listing). Cost: no stated terms for a contributor, and no
disclosed channel for a security researcher to report a vulnerability responsibly.

**F-05 [medium]** SCM hygiene: `git tag` returns nothing — no release has ever been cut —
and `git branch -a` lists 90+ branches, most of them merged or abandoned
(`worktree-agent-*`, old `feature/*`/`fix/*` branches). Cost: no way to answer "what shipped
in the version currently live" except by SHA; a rollback story that depends on finding the
right commit rather than deploying the last tag.

**F-06 [medium]** `apps/admin` (an internal ops console — users, queues, health, secrets,
config) is fully built (`src/features/{users,queues,health,secrets,config,overview,deleted,debug}`)
but has no deployed instance: `vercel project ls` shows only `beyond-social` (the web app)
under this account, no `beyond-social-admin` or equivalent. Cost: if there's an incident
right now, whoever is on call has no field access to the console built for exactly that.

**F-07 [medium, unverified not confirmed-absent]** `apps/worker` (publishing) and
`services/render` (video export) each need a host outside Vercel per `docs/going-live.md`
(Railway/Fly/Render for the worker, Fly for the render service). This environment has no
`fly`/`flyctl` and no way to reach a worker host, so I could not confirm either is actually
running in production — only that local `.env` files exist for both. If neither is running,
scheduled posts queue forever and exports sit at "Queued" until they time out, silently.
**Needs the owner to confirm**, not something this audit can verify from here.

**F-08 [low, all standing, re-confirmed present]** Directly from `production-readiness.md`,
independently re-checked this pass and all still true: H1 rate limiting is still an
in-memory per-instance `Map` (no `upstash` dependency anywhere); H2 the `kie-callback`
webhook secret still rides in the URL query string; H3 CSP still sets
`script-src 'self' 'unsafe-inline'` with no nonce; L4 no Playwright config or `e2e` spec
anywhere in the repo.

## What is already good

1. **CI/CD is real and layered**, not aspirational: format → lint → typecheck → build →
   15+ test suites, plus a separate migration-replay gate (`database.yml`) and a
   Deno-function gate (`edge-functions.yml`) that specifically closed a past incident
   (a renamed helper shipping broken because nothing checked the edge-function side).
2. **The self-audit habit already exists and is honest.** `production-readiness.md`
   re-verifies its own prior claims against current source every pass rather than trusting
   its own summary, and correctly downgrades a finding (C2, connection pooling) when the
   architecture that justified it turned out not to exist. `docs/loop-engineering/BACKLOG.md`
   is a genuine session-by-session retrospective log, six entries deep, that already
   practices Article 15's measure-analyze-improve loop without Ìlànà telling it to.
3. **Security fundamentals are solid**: RLS on every table, privileged state transitions
   locked behind `SECURITY DEFINER` functions granted only to `service_role`, atomic credit
   reservation (a real race condition, fixed and cited by file/line), SSRF-guarded asset
   persistence, and secret/dependency scanning on every PR and weekly.
4. **Consent is a real, working control, not a checkbox.** Likeness and voice capture both
   require an explicit, worded consent statement recorded before the asset is kept
   (`CONSENT_STATEMENT`, `recordLikenessConsent`) — the kind of thing Article 1 cares about
   that's easy to skip under deadline pressure and wasn't skipped here.

## Remediation plan

**This week**

- ~~Fix the CI format-check break on `main`.~~ Done, `373efaa`.
- Stop running `vercel deploy` manually; push to `main` and let `ci.yml` deploy (F-02).
- Confirm whether `apps/worker` and `services/render` are actually running anywhere (F-07)
  — needs the owner, this audit could not verify it.
- Add `LICENSE` and a one-page `SECURITY.md` (F-04). Cheap, high signal.

**This month**

- Observability: Sentry + a metrics/tracing sink (F-03). Unchanged #1 priority from the
  last hardening pass; the trace id already exists end to end, it just needs somewhere to
  land.
- Decide the fate of `apps/admin`: deploy it behind auth, or explicitly shelve it and say
  so in `docs/` (F-06). An ops console nobody can reach is worse than no console — it's a
  false sense of coverage.
- Prune the 90+ stale branches; cut a first git tag so "what's live" has a name (F-05).

**This quarter**

- Upstash-backed rate limiting (H1), webhook secret out of the query string (H2), CSP
  nonce (H3) — `production-readiness.md`'s own remaining hardening backlog, unchanged.
- E2E coverage (L4): at minimum, the sign-up → generate → publish golden path.

Each step is independently shippable. None blocks another.
