# Development guide

## Toolchain

- **Package manager:** pnpm workspaces (`pnpm-workspace.yaml`)
- **Task runner:** Turborepo (`turbo.json`)
- **Language:** TypeScript in strict mode with additional safety flags
- **Linting:** ESLint 9 flat config, shared via `@beyond-social/eslint-config`
- **Formatting:** Prettier (`.prettierrc.json`)

## Common commands

```bash
pnpm install        # Install all workspace dependencies
pnpm dev            # Start the dev stack (runs ./dev.sh)
pnpm build          # Build all apps and packages
pnpm lint           # Lint the workspace
pnpm typecheck      # Type-check the workspace
pnpm format         # Format with Prettier
pnpm verify         # build + lint + typecheck (matches CI)
```

### Local development startup

Start the stack with the controlled script, not raw Turbo:

```bash
pnpm dev   # or: ./dev.sh
```

Do not run `turbo run dev` (or an unfiltered `pnpm dev` that shells out to it)
at the repo root. Turbo starts every workspace dev server at once, and several
cold-starting bundlers compiling simultaneously can pin CPU and RAM and freeze
the machine. `dev.sh` starts a curated set of services one at a time, waiting
for each to come up before starting the next, with per-service logs in
`.dev-logs/` and clean teardown on Ctrl+C. Add new services to the `SERVICES`
list in [`dev.sh`](../dev.sh).

Turbo remains the task runner for `build`, `lint`, and `typecheck`, which are
safe to fan out. To run a single package's dev server directly:

```bash
pnpm --filter @beyond-social/web dev
pnpm --filter @beyond-social/worker dev
```

## Project conventions

### File organization

Every feature owns its components, hooks, types, validation, and API logic.
Keep concerns in separate modules:

```
src/
├── app/          Next.js routes (pages, layouts, route handlers)
├── components/   Reusable presentational components
├── features/     Feature modules (each self-contained)
├── hooks/        Reusable React hooks
├── lib/          Framework-agnostic utilities and clients
├── server/       Server-only logic (never imported client-side)
├── services/     Integrations with external systems
├── schemas/      Zod schemas
└── types/        Shared type definitions
```

Aim for under 200 lines per file. When a file outgrows a single responsibility,
split it.

### TypeScript

- `any` is banned. Reach for interfaces, discriminated unions, generics, and
  inferred types instead.
- Type every API boundary explicitly.
- Validate all external input (environment, request bodies, webhook payloads)
  with Zod before it enters the type system.

### Environment variables

Each app validates its environment through `@beyond-social/env`:

```ts
import { parseEnv } from "@beyond-social/env";
import { z } from "zod";

const schema = z.object({/* ... */});

export const env = parseEnv(schema, process.env);
```

Client-exposed values must be prefixed `NEXT_PUBLIC_` and referenced explicitly
so Next.js can inline them. Add new variables to the app's `.env.example` in the
same change.

### Adding a dependency

Dependencies are added deliberately, not because they are popular. Explain why a
dependency is needed and confirm before installing it.

## Git workflow

`main` is protected. All work happens on branches and lands through reviewed
pull requests. See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming,
commit style, and the pull request checklist.
