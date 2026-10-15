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

The New Video flow starts at `/dashboard/new` after signing in. It supports
searching TikTok or Instagram references by industry/topic and target-country
terms, reviewing an existing public post link, or starting from a structured
idea brief. The current discovery API treats country as part of the search
phrase rather than a separate regional filter; it also does not classify
results as human-led or product-focused. Link analysis shows the summary,
scene notes, and speech returned by the existing API; the creator can edit
those notes before continuing.

The guided generation form is available at `/dashboard/videos/new`. Briefs
from the New Video entry flow carry into that form, and drafts autosave in the
current browser. The form uses the Go API to quote and generate a single
3–15 second scene. The current scene generator accepts text prompts only;
saved avatars and assets are retained as guidance in the draft but are not sent
as provider reference files.

The Assets page includes a categorized media upload list with previews and
browser-local names. Uploaded files use the account's private storage, but the
media API does not yet list or permanently delete account files; the list and
names therefore do not sync between browsers, and removing or replacing a
listed item does not delete the prior stored file.

The Schedule page displays scheduled/published post statuses in a calendar and
allows eligible posts to be cancelled after confirmation. Videos in the Library
can be queued or scheduled with a platform, title, caption, visibility, and
date/time. Editing or rescheduling posts depends on API operations that are not
currently available. Analytics currently explains
that account-level performance metrics are not supplied by the API; it does not
display invented figures. Admin Monitoring reports recorded action usage and
estimated provider costs, not full company profit.

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
