# Architecture

Beyond Social is a modular system. A Next.js frontend talks to an application
layer, which coordinates a datastore, a background job queue for AI generation,
and billing. The job queue is what lets video generation run in the background
without blocking the dashboard, and it is what makes the platform scale as usage
grows.

## System overview

```
User (browser)
      │
      ▼
Frontend: Next.js (Vercel)
  Dashboard · Conversational AI · In-browser editor
      │
      ▼
Application / API layer (Node.js)
  Auth · Credits & quota · Orchestration
      │
      ├────────────┬──────────────┬─────────────────┐
      ▼            ▼              ▼                 ▼
  Supabase    BullMQ + Redis   Stripe + Apple Pay  External AI
  Auth·DB·    Background job    Subscriptions·      Higgsfield (WAN 2.6)
  Storage     queue            Billing             Claude/GPT · Firecrawl
                   │
                   ▼
            Background worker
              Video generation, then writes results to Supabase storage
                   │
                   ▼
        Upload-post: publishing & scheduling
          TikTok · Instagram · Facebook · YouTube Shorts
```

External AI services (Higgsfield, Claude/GPT, Firecrawl) and the publishing
layer (Upload-post) sit behind the API layer as swappable integrations. None of
them are wired directly into the frontend, so any one can be replaced later
without a platform rebuild.

## How a video moves through the system

1. The user describes an idea in the conversational interface, or picks a
   suggestion from the trend feed.
2. The API layer requests a script from Claude/GPT, then enqueues a
   video-generation job in BullMQ so the user is not stuck on a loading screen.
3. A background worker runs the job through Higgsfield's WAN 2.6 pipeline using
   the user's uploaded photos, and writes the result to Supabase storage.
4. The user opens the finished draft in the in-browser editor to trim, caption,
   and adjust.
5. On publish, the API layer calls Upload-post, which schedules the post to the
   chosen platforms at AI-recommended times.
6. Firecrawl runs on a schedule to refresh the trend feed, independent of any
   single user action.

## Monorepo structure

The system's two runtime processes map onto two apps:

- **`apps/web`**: the Next.js frontend and the API layer (route handlers). This
  is the Vercel deployable.
- **`apps/worker`**: the long-running BullMQ worker. It cannot run on
  serverless functions, so it is a separate deployable process.

Shared code lives in `packages/`:

- **`packages/env`**: a Zod-validated helper for parsing environment variables.
  Both apps define their own schema and fail fast on invalid configuration.
- **`packages/eslint-config`**: the shared ESLint flat config.
- **`packages/typescript-config`**: shared strict `tsconfig` bases.

Internal packages are consumed as TypeScript source (no build step). The web app
transpiles them via `transpilePackages`; the worker bundles them with `tsup`.

## Build scope

The v1 build covers subscriptions, the user dashboard, conversational AI video
generation, the in-browser editor, AI publishing and scheduling, content
optimization, and a v1 trend-discovery feed.

Out of scope for v1: native mobile apps, multi-user or agency-seat accounts, and
deep analytics dashboards. These are natural follow-ups once the core platform is
live.
