# Beyond Social

AI-powered social media video platform. Beyond Social takes a user from a
conversational prompt to a finished, captioned short-form video and schedules it
across TikTok, Instagram, Facebook, and YouTube Shorts.

This repository is a pnpm + Turborepo monorepo. It is under active development;
the current state is the production-grade project foundation.

## Tech stack

| Concern     | Technology                              |
| ----------- | --------------------------------------- |
| Frontend    | Next.js (App Router), React 19          |
| API layer   | Node.js                                 |
| Data        | Supabase (Postgres, Auth, Storage)      |
| Job queue   | BullMQ + Redis                          |
| Payments    | Stripe + Apple Pay                      |
| AI services | Higgsfield (WAN 2.6), Claude/GPT        |
| Trends      | Firecrawl                               |
| Publishing  | Upload-post                             |
| Language    | TypeScript (strict), validated with Zod |

## Repository layout

```
beyond-social/
├── apps/
│   ├── web/                Next.js app (dashboard, editor, API routes)
│   └── worker/             Background worker (BullMQ job processors)
├── packages/
│   ├── env/                Zod-validated environment boundary
│   ├── eslint-config/      Shared ESLint flat config
│   └── typescript-config/  Shared tsconfig bases
├── docs/                   Architecture and development guides
└── .github/                CI workflow and PR template
```

The web app and the worker are separate deployables: Next.js runs on Vercel,
while the worker is a long-running Node process that cannot live on serverless
functions.

## Prerequisites

- Node.js `>=22` (see [`.nvmrc`](.nvmrc))
- pnpm `>=11` (`corepack enable` provisions the pinned version)

## Getting started

The quickest way, one command. It creates local env files on first run,
installs dependencies if needed, and starts everything:

```bash
./start.sh
```

Prefer to do it by hand? That is equivalent to:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
pnpm dev
```

Both `./start.sh` and `pnpm dev` run [`dev.sh`](dev.sh), which starts services
one at a time with clean teardown. Do not run `turbo run dev` at the repo root;
see the [development guide](docs/DEVELOPMENT.md#local-development-startup) for why.

The web app serves on [http://localhost:3000](http://localhost:3000) and exposes
a health check at `GET /api/health`. The worker exposes a liveness endpoint on
`WORKER_PORT` (default `9100`) at `GET /health`.

## Scripts

Run from the repository root; Turborepo fans each task out across the workspace.

| Command          | Description                            |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | Start all apps in development          |
| `pnpm build`     | Build every app and package            |
| `pnpm lint`      | Lint the entire workspace              |
| `pnpm typecheck` | Type-check the entire workspace        |
| `pnpm format`    | Format the codebase with Prettier      |
| `pnpm verify`    | Build, lint, and typecheck (CI parity) |

## Documentation

- [Architecture](docs/ARCHITECTURE.md): how the system fits together
- [Development guide](docs/DEVELOPMENT.md): conventions and workflow
- [Contributing](CONTRIBUTING.md): branching, commits, and pull requests
