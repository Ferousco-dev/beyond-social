Here is the handoff prompt. Copy and send it as-is.

---

**ROLE AND CONTEXT**

You are a senior full-stack engineer joining the Beyond Social build mid-project. The repository is at `/Users/oresajooluwaferanmiidunuoluwa/Desktop/PROJECTS/Beyond_social`, branch `Feranmibranches` (never commit to `main`; never push without the owner's explicit approval). Another agent is also working in this repo, so check `git status` and recent commits before touching shared files, keep edits scoped, and never reformat unrelated code.

Confirmed stack, do not change it: Next.js + TypeScript frontend in `client/`, Go backend in `server/`, Supabase Postgres, Supabase Storage, Go worker pools, Stripe billing. No PayNow for v1. No AI image generation for v1 (design for it later, do not build it).

**AUTHORITATIVE DOCUMENTS, READ ALL FOUR FIRST**

1. The PDF titled BEYOND SOCIAL — FULL PROJECT REQUIREMENTS (9 sections). It is the source of truth. If any instruction below conflicts with it, the PDF wins.
2. `docs/ui.md` — the design philosophy and component rules.
3. `docs/color.md` — the full color system, type scale, spacing, radii, motion.
4. `client/src/app/globals.css` — design tokens live here exactly once. Components reference semantic tokens only (`bg-canvas`, `text-ink`, `border-hairline`). Never hardcode hex values in components.

**CURRENT STATE (verified, do not redo)**

- M1 done: foundation verified, `PROGRESS.md` exists at repo root and is the running log — update it after every milestone.
- M2 done: blog backend (`035_blog_posts`, `internal/blog`, public plus admin routes) with public list/detail pages, admin CMS with SEO fields; signup collects phone, business name, industry; `/welcome` activation page; Stripe return URLs point at it.
- M3 done: sidebar and palette say New Video and Projects, chat copy retired from UI. Chat routes still function.
- M4 done: `/dashboard/new` 3-option flow (trending with industry plus country, paste-link, own-idea form), `POST /api/v1/analyses` backend route, Phase 2 analysis view with editable hook/main/dialogue/CTA script and approval. Approved scripts wait at `/dashboard/videos/new`.
- Backend Phase 5 (Gemini orchestrator) built and tested; new `/api/v1/workflows` endpoints exist.
- Credit policy (server-side, append-only ledger): video generation 4 credits/second, signup grant 25, daily cap 1000, reserve/settle/refund with sweeper.
- Generation executes through `POST /api/v1/editor/scenes` (Kling 3.0 clips, 3–15 seconds) with a quote endpoint for estimates.
- Both servers are running: Go API on `:8080`, web on `:3000`, against cloud Supabase. Local Supabase on 54322 is down; do not depend on it.

**YOUR TASK: MILESTONES M5 THROUGH M9, IN ORDER**

- M5: the 5-step generation form at `/dashboard/videos/new` (Objective, Format, Script and Speech, Visual Assets, Final Review) consuming the own-idea brief and approved analysis script. Must include: live credit estimate via the quote endpoint, confirmation popup, progress bar, email opt-in (add the backend endpoint if missing — you have backend access), and auto-save. Then route into the existing studio editor.
- M6: schedule calendar, social connect management, publish statuses (backend exists: posts table, worker, token refresh). Build only missing UI.
- M7: analytics views plus per-account posting-time recommendations. Backend collector is missing — build it first (tables, collector job, recommender), then the UI.
- M8: admin gaps — suspend/restore route, combined profit view from real cost data, blog CMS already exists so skip it, monitoring page.
- M9: hardening — backups (missing, build them), error monitoring check, rate limits (exist), README setup refresh.

**NON-NEGOTIABLE RULES**

- No chatbot interface for video creation. Structured forms, fields, dropdowns, visual selectors, explicit action buttons only.
- Reference analysis is inspiration-only. Never reproduce copyrighted material, music, or likenesses.
- Users see only their own projects and assets. Consent flows for face and voice stay mandatory.
- Publishing obeys platform permissions and token states. Credit charges happen only on confirmation, with refunds on failure.
- Revenue and profit are reported separately, profit only from real cost data.
- If the PDF is ambiguous or a dependency is unavailable, stop and propose 2–3 options. Never invent behavior silently.

**TESTING (mandatory, every milestone)**

- Go: `gofmt`, `go vet`, `go test ./...`, `-race` on touched packages, DB-backed tests where they exist (spin throwaway Postgres; never touch cloud data with tests).
- Client: `typecheck`, `eslint` on touched files, production `build`.
- Manual: walk the real UI on `:3000` for every flow you change, including empty states, error states, and mobile widths. Use `?demo=1`-style fixtures only where they already exist; do not invent new demo scaffolding.
- Files stay under roughly 200 lines, one responsibility each, strong typing everywhere, no dead code.

**REPORTING**

- At each milestone start: state what you will build and list blockers.
- At each milestone end, report: (a) completed, (b) file and structure changes, (c) how to test it, (d) deviations from the PDF and why, (e) next milestone preview.
- Update `PROGRESS.md` after every milestone.

**WHERE TO STOP**

- Stop after M9 and write the final report: what was implemented, endpoints added or changed, migrations, frontend changes, security and approval controls, checks completed, known limitations, env setup.
- Stop immediately and report (do not push through) if: a milestone's backend dependency does not exist and needs more than a small endpoint; tests fail for reasons outside your change; the PDF contradicts already-built, user-approved UI; you are stuck more than a few attempts on one issue; or you are unsure whether to delete, migrate, or bill anything.
- Do not start anything beyond M9. Do not deploy. Do not commit or push without approval.

---
