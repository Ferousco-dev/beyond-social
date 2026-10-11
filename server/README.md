# Server

This folder is the new Go application boundary for Beyond Social.

## Purpose

- Own the authenticated API layer and business workflows.
- Validate AI plans before they reach providers.
- Manage durable generation state, retries, and recovery.
- Keep Supabase as the infrastructure layer for Postgres, auth, and storage.

## Layout

- `cmd/api` contains the HTTP entrypoint for the application.
- `internal/` holds business logic, domain services, and adapters.
- The repository keeps the preserved frontend at `client` while the backend is rebuilt in Go.

## Current status

This is the initial scaffold for the reset. The next phase is to move the actual orchestration and API contracts into Go and unify provider interfaces under `services/`.
