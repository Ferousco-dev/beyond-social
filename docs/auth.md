# Authentication

Supabase-backed auth for the web app: email/password, OAuth, email verification,
and password reset, with route protection and role-based access.

## Flow

```
                 ┌─────────── /signup ──────────┐
                 │  name, email, password        │
                 │  (Zod + strength meter)       │
                 ▼                               │
   supabase.auth.signUp ──▶ email sent ──▶ /verify (6-digit OTP)
                                                 │
   /login ──▶ signInWithPassword ──────────────┐│
     │  or OAuth (Google/Apple/GitHub/MS)      ││
     ▼                                         ▼▼
  middleware refreshes session ──▶ /dashboard (protected)

   /forgot-password ──▶ reset email ──▶ /reset-password ──▶ /login
```

OAuth and email links return to `/auth/callback`, which exchanges the code for a
session and forwards the user on.

## Folder structure

```
apps/web/src/
├── app/
│   ├── (auth)/               Route group: shared split-screen layout
│   │   ├── layout.tsx        Branding panel + form column
│   │   ├── login/ signup/ forgot-password/ reset-password/ verify/
│   ├── auth/callback/route.ts  Code exchange
│   ├── dashboard/            Protected example route
│   └── middleware.ts         Session refresh + route guards
├── features/auth/
│   ├── actions.ts            Server actions (server-only auth calls)
│   ├── schemas.ts            Zod schemas + inferred types
│   ├── password-strength.ts  Client-side strength heuristic
│   └── components/           Forms, fields, OTP, social buttons, branding
└── lib/supabase/
    ├── client.ts             Browser client
    ├── server.ts             Server/action client (cookies)
    └── middleware.ts         Edge session handling
```

## Architecture

- **UI vs logic:** components render and collect input; all auth calls live in
  server actions (`features/auth/actions.ts`). The browser never holds service
  logic beyond OAuth redirects.
- **State:** React Hook Form + Zod per form; `useTransition` drives pending
  state; no global store is needed for auth screens.
- **Validation:** one Zod schema per flow, shared by the client resolver and the
  server action (defense in depth).
- **Routing:** middleware refreshes the session on every request, redirects
  unauthenticated users away from protected prefixes, and signed-in users away
  from auth screens.

## Security per screen

- **Login:** generic "invalid email or password" (no account enumeration);
  submit disabled while pending; Caps Lock warning; `autocomplete` hints.
- **Signup:** live strength meter, confirm-match, `new-password` autocomplete.
- **Forgot password:** always returns success text regardless of account
  existence.
- **Reset:** requires a valid recovery session; new strong password enforced.
- **Verify:** OTP is digits-only, paste-aware, with a resend cooldown.
- **All:** server actions are the trust boundary; RLS enforces per-row access in
  Postgres (`supabase/migrations/0001_init_auth.sql`).

## Error and loading strategy

- Errors surface inline via a single `role="alert"` status region with generic,
  user-safe copy.
- Buttons show a spinner and disable during submission to prevent double submits.
- A not-configured guard returns a friendly message before Supabase exists.

## Accessibility

Labels tied to inputs, `aria-invalid` + `aria-describedby` on errors, visible
focus rings, keyboard-operable OTP, `aria-live` status, and full light/dark
support. Motion respects `prefers-reduced-motion`.

## Deferred (next iterations)

Wired to grow without rework: TOTP MFA (enabled in `config.toml`), trusted-device
and active-session management, CAPTCHA after repeated failures, HIBP breach
checks, inactivity auto-logout, and the RBAC-gated settings pages.

## Testing strategy

- Unit: Zod schemas and `password-strength` (pure functions).
- Component: form validation and states with Testing Library.
- E2E: signup → verify → login → protected route → logout with Playwright
  against a local Supabase instance.
