# Defect register: beyond-social

| ID      | Severity | Title                                                     | State  | Evidence                                                                                | Fix                                    |
| ------- | -------- | --------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- | -------------------------------------- |
| DEF-001 | Critical | `main` CI red for 4 pushes on format-check                | Closed | `gh run list`, 4x `failure` on `Format check` step                                      | `373efaa`                              |
| DEF-002 | High     | Manual `vercel deploy` redundant with CI's own deploy job | Open   | `gh run view` showing `Deploy production: success` from CI alone                        | Process change: stop manual deploys    |
| DEF-003 | High     | No observability (Sentry/APM)                             | Open   | No `@sentry/*` in any `package.json`                                                    | Pending owner priority                 |
| DEF-004 | Medium   | No LICENSE / SECURITY.md / CODE_OF_CONDUCT.md             | Closed | Confirmed absent by directory listing                                                   | Added all three, this session          |
| DEF-005 | Medium   | No git tags ever cut; 90+ stale branches                  | Open   | `git tag` empty, `git branch -a` count                                                  | Pending owner                          |
| DEF-006 | Medium   | `apps/admin` built but not deployed                       | Closed | `vercel project ls` had no admin project                                                | Deployed, `20a5d7d`                    |
| DEF-008 | High     | `apps/admin` deployed pointing at localhost Supabase      | Closed | Env vars sourced from `apps/admin/.env.local` (a dev placeholder), not the real project | Corrected via `vercel env`, redeployed |
| DEF-007 | High     | No client-side crash visibility (part of DEF-003)         | Open\* | No error reporting anywhere in `apps/web`                                               | Firebase wired, `20a5d7d`              |

\*DEF-007 code is shipped but inert until `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is set —
Google Analytics must be linked to the `beyond-social-app` Firebase project from the
console; the CLI has no command for it. DEF-003 (server-side observability) is unaffected
by this and stays fully open.

Full context for each: `docs/ilana-audit.md`, Findings section, and `.ilana/ledger.md`'s
"User selected findings to act on" entry.
