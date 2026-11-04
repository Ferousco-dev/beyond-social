# Resetting the Supabase project

Target: project `rluswrevtevrrijaqowu` ("Beyond web solutions", Stockholm). Both
the old web app and the new Go API point at it.

## What this destroys, permanently

- Every user account (`auth.users`), so everyone must sign up again.
- Every table, function, policy and row in `public`: chats, projects, credits,
  billing records, social connections, memory, admin data. Nothing is exported.
- Every storage bucket and file: uploads, renders, avatar recordings.
- Scheduled jobs and the old migration history.

It does not touch Stripe, HeyGen, KIE, Apify or any provider account. A trained
HeyGen avatar or voice stays in HeyGen unless deleted there. Deployed edge
functions stay deployed until deleted (they will find no tables and fail).

## Steps

1. `preflight.sql` (read only). Confirm the database and the counts are what you expect.
2. `wipe.sql`, in one transaction. Nothing changes if it errors.
3. `wipe-storage.sh` (needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`).
4. Start the Go API once with `DATABASE_URL` set to the Supabase **session pooler**
   string. It applies migrations 001 to 009, which create the tables, row-level
   security and the private `avatar-footage` bucket.

## Auth after the reset

Supabase Auth keeps working, because only the users were deleted, not its settings.
Check in the dashboard (Authentication > URL Configuration):

- Site URL and redirect URLs include the deployed frontend and
  `/auth/callback`, plus `http://localhost:3000/auth/callback` for local work.
- Email confirmation matches how you want sign-up to behave.

Then sign up with a new account. The first request to the API creates that user's
profile row, so no trigger or backfill is needed. The first admin is set by hand:
`update public.profiles set role = 'admin' where email = '...';`
