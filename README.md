# Beyond Social

This repository is in a reset and rebuild phase. The goal is to preserve the
existing interface while moving the application toward a Go-first backend with
separate provider services and a clean domain boundary.

## Architecture reset

The active structure is now:

```text
beyond-social/
├── client/                Frontend alias for the preserved web app
├── server/                Go backend scaffold and API entrypoint
├── services/
│   ├── apify/             Discovery and reference retrieval
│   ├── kie/               Video generation and transformation
│   ├── heygen/            Avatar and voice services
│   └── gemini/            Orchestration and evaluation
├── apps/
│   └── web/               Existing frontend application retained intact
├── packages/              Shared TypeScript packages
├── archive/
│   └── legacy/            Archived Node/Supabase integration stack
├── docs/                  Architecture and implementation docs
├── README.md
├── .gitignore
└── package.json
```

The frontend remains intact and is preserved via the `client` alias pointing at
`apps/web`, so the existing UI and design system are not redesigned or deleted
as part of the reset. The legacy worker, render, and Supabase integration code
has been moved into `archive/legacy` so the active branch reflects the rebuilt
contract boundary without losing the recoverable implementation history.

## Active backend direction

- `server/` is the Go application boundary.
- `services/` hosts provider-specific adapters, with explicit contracts.
- Supabase remains the infrastructure layer for PostgreSQL, auth, and storage.
- The Go backend is responsible for auth, validation, permission enforcement,
  orchestration, execution, job state, and retries.

## Legacy compatibility

The repository still contains the previous Node and Supabase implementation while
we migrate the system. This is intentional: the reset establishes a clean
boundary without discarding the working UI prematurely. The preserved frontend
remains the source of truth for user experience while the new Go backend is
introduced underneath it.

## Verification and next steps

- Backup branch: `backup/pre-reset-2026-10-11`
- Application branch: `Feranmibranches`
- Default remote branch: `origin/main`

The next implementation phase is to move the business orchestration and provider
contracts from the legacy implementation into the Go service layer while keeping
frontend behavior stable.
