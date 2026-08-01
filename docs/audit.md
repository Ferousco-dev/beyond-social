# Production readiness audit

A living document. Every entry is either **verified** (reproduced, with the
evidence noted) or **unverified** (read from the code, not observed running).
The distinction matters: an unverified finding is a hypothesis.

Ranked by impact against effort. Effort is rough: S is under an hour, M is a
session, L is a project.

---

## Verified and fixed

| Finding                                                                                                                                                                                                                                            | Evidence                                                                                                  | Commit    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------- |
| Models page rendered empty while two active rows were readable. `MODEL_FAMILIES` never gained `avatar` after migration 0048 widened the constraint, and rows were parsed as an array, so one unknown row failed the parse for the whole catalogue. | Reproduced by reverting the enum: the smoke test fails on exactly that row.                               | `94bddbe` |
| Attachments vanished on send. Photos and voice clips were recorded against the generation, never the message.                                                                                                                                      | `project_thread` returned no attachments for a turn that had them; verified in a rolled-back transaction. | `ab96eb4` |
| The avatar path never persisted a turn at all, losing the request, reply and attachments on reload.                                                                                                                                                | `startAvatarGeneration` contained no write to `messages`.                                                 | `ab96eb4` |
| A new chat did not appear in the sidebar. The sidebar is rendered by the dashboard layout, which a page-level `revalidatePath` does not reach, and the hook seeded its state once and never adopted a later server render.                         | Read: `useProjectMutations` had no sync effect; `sendMessage` revalidated only the page.                  | `ab96eb4` |
| The first message could blink out. The reply was left to a server render that had not arrived, and an empty thread was adopted over messages already on screen.                                                                                    | Read: the new-project branch returned before appending the reply.                                         | `ab96eb4` |
| Drafts rendered as an empty grey box. `persistRender` built the public URL from `SUPABASE_URL`, which inside the functions runtime is the internal gateway (`http://kong:8000`) and unreachable from a browser.                                    | Two stored rows carried that host. After repair, the URL serves `200 video/mp4`, 1.9 MB.                  | `ab96eb4` |
| `createSignedUrls` returns failures with `signedUrl: null`, not the null `path` assumed. One missing object blanked every attachment in a thread.                                                                                                  | Caught by the attachment smoke test against the real storage API.                                         | `ab96eb4` |
| 52 files had drifted out of Prettier style with nothing in CI to catch it.                                                                                                                                                                         | `format:check` failed on arrival.                                                                         | `4c99edc` |
| Migrations had no automated check of any kind.                                                                                                                                                                                                     | No workflow applied them.                                                                                 | `541c9c2` |

---

## Critical

**C1. Three high-severity advisories in Next, including SSRF in Server Actions.**
Impact high, effort S. Installed `15.5.20`; the advisories are patched in
`>=15.5.21` and `15.5.22` exists. The declared range `^15.1.3` already permits
it, so this is a lockfile bump, not a major upgrade. This app routes every
upload, send and avatar render through Server Actions, so the SSRF advisory is
directly relevant rather than theoretical.

I attempted this and the registry timed out twice fetching the tarball. The
lockfile was reverted so the tree stays consistent. Re-run when the network
cooperates:

```bash
pnpm -r update next eslint-config-next
```

Then confirm with `pnpm audit --audit-level high`.

**C2. Eight high advisories overall.** Impact high, effort S–M. Beyond Next:
`sharp` (libvips CVE-2026-33327), `postcss` (arbitrary file read, path
traversal), `brace-expansion` (DoS). The new Security workflow reports these
weekly but only fails on critical, deliberately, so it does not sit red for
reasons unrelated to the change under review.

---

## High

**H0. The avatar model is active only on the local database.** Impact high,
effort S, but it is a product decision rather than a code fix. Migration 0048
inserts `infinitalk/from-audio` with `is_active = false` and no later migration
turns it on, so a freshly migrated database has **one** active model, not two.
Local has two because the flag was flipped by hand.

Verified: the Database workflow reports `the catalogue has active rows (1 rows)`
against a database built purely from migrations, while local reports two.

This means that once the hosted database catches up, the avatar feature will not
appear in the market at all, and `getModel` returns null for it because RLS
hides inactive rows. Deliberately not fixed here: 0048 says the row is "inactive
until the feature ships, so the gate refuses it rather than letting a half-built
path spend a credit", and the avatar path has still never dispatched
successfully. Activating it in a migration would contradict that and open a paid
path that does not work. It needs a migration once the path is proven, not
before.

The general lesson is the one this whole finding is an instance of: the local
database has drifted from what the migrations produce, so anything verified
locally may be verifying state that no other environment has.

**H1. `conversation-thread.tsx` is 435 lines against a ~200 line rule.**
Impact medium, effort M. It now carries send, avatar, regenerate wiring,
seeding and optimistic reconciliation. The seam is a `use-send-turn` hook, as
already identified. This file has absorbed every change in this session and is
the most likely place for the next bug to hide.

**H2. Hosted database is 25 migrations behind.** Impact high, effort S, risk
high. Hosted sits at 0028; the tree is at 0053, including a credit re-base and
the new `message_attachments`. This is a destructive-adjacent operation and is
the owner's call, not something to run unattended.

**H3. Regenerate does not show its price.** Impact medium, effort S. The confirm
says it spends credits without naming the number, because the cost depends on
the model the run resolves to and a hardcoded figure that disagreed with the
charge would be worse than none. Plumbing the video model's `creditCost` into
the thread fixes it properly.

---

## Medium

**M1. No `loading.tsx` for most routes.** Impact medium, effort S. 39 pages
exist; the dashboard root, docs, blog, status, and every marketing route lack a
loading state, so navigation to a slow route shows nothing. `app/dashboard/c/[id]`
and the settings routes already have one, so the pattern exists to copy.

**M2. The public API contract constrains the schema.** Impact medium, effort L.
`result_url` is returned by `/api/v1/generations`, declared in `openapi.ts` and
documented, so the storage-path-on-read pattern used for attachments cannot be
applied to renders without a contract change. Worth doing deliberately, with a
version bump, rather than opportunistically.

**M3. Smoke tests cannot run without a live stack.** Impact low, effort S. Now
addressed for catalogue and attachments via the Database workflow, but the
pattern should extend: several `test:*` scripts assert fallback behaviour
precisely because no service is configured, which is a narrower test than it
looks.

---

## Low

**L1. Two `no-console` lint warnings** in `app/error.tsx` and
`app/global-error.tsx`. Both are legitimate error-boundary logging. Either route
them through `lib/logger` or add a scoped disable with the reason, so the lint
output is clean and a real console statement stands out.

**L2. `pnpm audit` noise.** The `low` esbuild advisory affects the dev server
only and is not a production concern.

---

## Security: audited, no findings

Worth recording as carefully as a defect, because it says where not to spend
effort. All of this was checked against the running database, not read from
migrations.

- **Every table in `public` has row level security enabled.** No exceptions.
- **Sixteen tables have RLS on and no policies at all**, which is deny by
  default and correct for them: caches, rate limits, the prompt engine's
  internals, mail, billing events, `managed_secrets`. They are reachable only
  through the service role.
- **All 81 `SECURITY DEFINER` functions pin `search_path`.** Not one is
  unpinned, which is the classic escalation route: a definer function that
  resolves an unqualified name through a caller-controlled `search_path` runs
  attacker code as the definer.
- **The `admin_*` functions are `EXECUTE`-able by `anon` and `authenticated`**,
  which looks alarming and is not. Postgres grants execute to `PUBLIC` by
  default and every one of them guards internally with `is_admin()`. Verified
  empirically rather than by reading: calling `admin_secrets_list` and
  `admin_search_users` over REST with the anon key returns
  `{"code":"P0001","message":"Admin only"}`.
- **API routes are all guarded.** The `v1` routes take a bearer API key, the
  cron routes a shared secret, and the Stripe webhook verifies the signature
  against the raw body rather than a parsed one.

The remaining security exposure is dependency advisories (C1, C2), not the
application's own authorisation model.

## Not audited, and why

The UI, UX, accessibility, responsive and visual-consistency phases are **not
covered here**. They need the application running and signed in, and I could not
obtain a session: the Browser pane has no cookies, the Chrome extension is not
connected, and entering a password or creating an account is not something I
do. Auditing 39 routes by reading JSX would produce confident-sounding claims
about rendered output I have never seen, which is worse than an honest gap.

To unblock, sign in inside the Browser pane. That covers Phases 1, 2, 3, 6, 7
and most of 12.

Two things worth noting from a static read, both **unverified**:

- Icon-only controls are consistently given `aria-label` and `aria-hidden` on
  the icon, which is the right pattern. Spot-checked, not exhaustively audited.
- There is one `dangerouslySetInnerHTML`, the inline theme script in
  `app/layout.tsx`. That is the standard no-flash pattern and the content is a
  build-time constant, not user input.
