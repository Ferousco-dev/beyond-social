# Beyond Social

Beyond Social is an AI-powered social media content platform. The web app brings
content discovery, planning and generation, video editing, avatar workflows,
and publishing tools into one workspace.

This repository contains the Next.js web app, a Go API with asynchronous
workflows, and shared TypeScript packages. Supabase provides authentication,
PostgreSQL, and storage.

## Repository layout

| Path        | Purpose                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `client/`   | Next.js web application and browser-facing product features.                                        |
| `server/`   | Go API, background job processing, and WebSocket events.                                            |
| `packages/` | Shared AI gateway, environment validation, prompt engine, rate limiting, and tooling configuration. |
| `docs/`     | Product, design, and engineering documentation.                                                     |

The browser app and Go API are separate processes in local development. The Go
API owns authenticated workflows such as discovery, video transformation,
avatar registration, and job status. Some web features also use Next.js route
handlers and server actions.

## Requirements

- Node.js 22 or newer
- pnpm 11 or newer
- Go 1.24 or newer
- A Supabase project and a PostgreSQL connection for the API

## Run locally

Install JavaScript dependencies and create local environment files:

```bash
pnpm install
cp client/.env.example client/.env.local
cp server/.env.example server/.env
```

Fill in the required values in both files. The web app needs the Supabase URL
and anon key, plus `NEXT_PUBLIC_API_URL` set to `http://localhost:8080` for the
local Go API. The API needs its Supabase URL and database connection string.
Provider credentials are needed for the workflows that use those providers;
see the comments in each example file. Keep real credentials in the ignored
local env files, never in commits.

Start the local stack:

```bash
pnpm dev
```

The root command runs `dev.sh`: it builds and starts the Go API first, waits
for its health endpoint, then starts the web app. By default, the web app is at
`http://localhost:3000` and the API is at `http://localhost:8080`. Logs are
written to `.dev-logs/`; press Ctrl+C to stop both processes. The API applies
database migrations during startup.

Do not run `turbo run dev` from the repository root. The curated startup script
starts services sequentially to avoid running multiple cold-starting compilers
at once.

## Common commands

| Command                      | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `pnpm dev`                   | Start the local API and web app.                |
| `pnpm build`                 | Build all Turbo workspaces.                     |
| `pnpm lint`                  | Lint all workspaces.                            |
| `pnpm typecheck`             | Type-check all workspaces.                      |
| `pnpm verify`                | Run the workspace build, lint, and type checks. |
| `cd server && go test ./...` | Run Go API tests.                               |

## Further reading

- [Web client guide](client/README.md): frontend setup, commands, and source layout.
- [Go API guide](server/README.md): API routes, authentication, asynchronous
  workflows, configuration, deployment, and Go tests..
