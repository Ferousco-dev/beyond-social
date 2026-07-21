# Contributing

This project is built to a production standard and is meant to be maintained for
years. Please read this guide before opening a pull request.

## Branching

`main` is protected and always deployable. Never commit to it directly and never
merge into it locally.

Create a focused branch for every unit of work:

```
feature/<scope>    New functionality, e.g. feature/video-pipeline
fix/<scope>        Bug fixes, e.g. fix/auth-session
refactor/<scope>   Internal changes with no behavior change
chore/<scope>      Tooling, dependencies, and housekeeping
```

Keep branches small and scoped to a single concern. Split large efforts into
several branches and pull requests.

## Commits

Write clean, imperative commit messages that describe the change:

```
Build authentication flow
Integrate Supabase authentication
Create video generation queue
```

- One logical change per commit.
- Use the imperative mood ("Add", "Fix", "Refactor").
- Do not use em dashes in commit messages.

## Pull requests

1. Open a pull request against `main` using the provided template.
2. Ensure CI is green: lint, typecheck, and build all pass.
3. Request review and wait for approval before merging.

Run the full verification suite locally before pushing:

```bash
pnpm verify
```

## Code standards

- **TypeScript is strict.** `any` is not allowed. Prefer interfaces,
  discriminated unions, generics, and inferred types.
- **Validate external input with Zod** at every boundary (env, API, webhooks).
- **One responsibility per file.** Aim for under 200 lines; split when a file
  grows past a single clear purpose.
- **Separate concerns:** UI, business logic, hooks, services, validation, and
  data access live in distinct modules.
- **No dead code, commented-out code, or placeholder implementations.** Comments
  explain _why_, not _what_.

See the [development guide](docs/DEVELOPMENT.md) for conventions and structure.
