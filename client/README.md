# Beyond Social Web

The Beyond Social web client is the Next.js application for discovering content,
planning and generating videos, editing assets, managing avatars, and publishing
to connected social platforms. It uses the App Router, React, and TypeScript.

## Run locally

Run these commands from the repository root. Install dependencies once, then
copy the client environment template:

```bash
pnpm install
cp client/.env.example client/.env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your
Supabase project values. Set `NEXT_PUBLIC_API_URL` to the Go API address,
`http://localhost:8080` for the default local stack. Add any other values needed
for the server-side features you plan to use; the template describes each one.

To run only the web client:

```bash
pnpm --filter @beyond-social/web dev
```

It serves on `http://localhost:3000`. API-backed features need the Go API to be
running as well. For the full local stack, configure `server/.env` and use the
[root setup](../README.md), which starts the API before the web app.

## Commands

Run from the repository root:

| Command                                      | Description                       |
| -------------------------------------------- | --------------------------------- |
| `pnpm --filter @beyond-social/web dev`       | Start the web development server. |
| `pnpm --filter @beyond-social/web build`     | Create a production build.        |
| `pnpm --filter @beyond-social/web start`     | Serve the production build.       |
| `pnpm --filter @beyond-social/web lint`      | Lint the client workspace.        |
| `pnpm --filter @beyond-social/web typecheck` | Type-check the client workspace.  |
| `pnpm --filter @beyond-social/web typegen`   | Generate Next.js route types.     |

## Source layout

| Path              | Responsibility                                                                |
| ----------------- | ----------------------------------------------------------------------------- |
| `src/app/`        | App Router pages, layouts, and route handlers.                                |
| `src/features/`   | Product areas such as discover, conversation, editor, library, and workspace. |
| `src/components/` | Shared UI components.                                                         |
| `src/hooks/`      | Shared React hooks.                                                           |
| `src/lib/`        | Shared clients and application utilities.                                     |
| `public/`         | Static assets served by Next.js.                                              |

Keep feature-specific UI and logic in its feature module. Use the shared
component and library folders for code that is genuinely reused across features.

## Environment and security

`NEXT_PUBLIC_` variables are included in browser code. Only put values safe to
expose publicly in those variables. Keep provider credentials, service-role
keys, and other secrets server-side in ignored local environment files. Never
commit `.env.local` or paste secret values into client components.

The Go API has its own environment template and setup instructions in the
[server guide](../server/README.md).

## UI references

Follow the repository's [UI guidelines](../docs/ui.md) and
[color tokens](../docs/color.md) when changing the interface.
