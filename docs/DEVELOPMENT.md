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
pnpm dev            # Run every app in development
pnpm build          # Build all apps and packages
pnpm lint           # Lint the workspace
pnpm typecheck      # Type-check the workspace
pnpm format         # Format with Prettier
pnpm verify         # build + lint + typecheck (matches CI)
```

Run a task in a single package with a filter:

```bash
pnpm --filter @beyond-social/web dev
pnpm --filter @beyond-social/worker build
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
