# Beyond Social

This repository is in a reset and rebuild phase. The goal is to preserve the
existing interface while moving the application toward a Go-first backend with
separate provider services and a clean domain boundary.

## Architecture reset

The active structure is now:

```text
beyond-social/
├── client/                Existing frontend application retained intact
├── server/                Go backend scaffold and API entrypoint
├── services/
│   ├── apify/             Discovery and reference retrieval
│   ├── kie/               Video generation and transformation
│   ├── heygen/            Avatar and voice services
│   └── gemini/            Orchestration and evaluation
├── packages/              Shared TypeScript packages
├── docs/                  Architecture and implementation docs
├── README.md
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

The frontend remains intact in `client`, and the old `apps/web` path has been
removed from the active branch as part of the reset. The legacy worker, render,
and Supabase integration code was removed from the active tree to keep the
branch focused on the new Go and service boundary.

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
