# Defect register: beyond-social

| ID      | Severity | Title                                                     | State  | Evidence                                                         | Fix                                 |
| ------- | -------- | --------------------------------------------------------- | ------ | ---------------------------------------------------------------- | ----------------------------------- |
| DEF-001 | Critical | `main` CI red for 4 pushes on format-check                | Closed | `gh run list`, 4x `failure` on `Format check` step               | `373efaa`                           |
| DEF-002 | High     | Manual `vercel deploy` redundant with CI's own deploy job | Open   | `gh run view` showing `Deploy production: success` from CI alone | Process change: stop manual deploys |
| DEF-003 | High     | No observability (Sentry/APM)                             | Open   | No `@sentry/*` in any `package.json`                             | Pending owner priority              |
| DEF-004 | Medium   | No LICENSE / SECURITY.md / CODE_OF_CONDUCT.md             | Closed | Confirmed absent by directory listing                            | Added all three, this session       |
| DEF-005 | Medium   | No git tags ever cut; 90+ stale branches                  | Open   | `git tag` empty, `git branch -a` count                           | Pending owner                       |

Full context for each: `docs/ilana-audit.md`, Findings section.
