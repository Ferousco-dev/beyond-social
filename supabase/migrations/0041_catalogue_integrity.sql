-- Two integrity holes wave 3 left open, both found by probing the tables
-- directly as `authenticated` rather than by reading the server code that
-- happens to use them correctly.
--
-- The theme is the same in both: a rule that exists only in TypeScript is not a
-- rule. Every one of these tables is reachable through PostgREST with the
-- caller's own JWT, so the server action is a convenience, never the boundary.

-- ---------------------------------------------------------------------------
-- 1. A preference must name a model of the family it is filed under
-- ---------------------------------------------------------------------------
-- `setPreferredModel` reads the family from the catalogue instead of trusting
-- the client, which is right, but the table did not require it: a signed-in
-- user could POST `(family: 'audio', model_id: 'veo3_fast')` straight to
-- PostgREST and the row was accepted. Proved on a clean database before this
-- migration; the insert returned `INSERT 0 1`.
--
-- The fix is a composite foreign key, so the pair has to exist in the
-- catalogue rather than each half existing separately.
-- Added rather than dropped-and-recreated: once the foreign key below depends
-- on this index, dropping it needs a cascade, and a migration that has to
-- cascade to re-run is a migration that cannot be re-run.
do $$ begin
  alter table public.model_catalog add constraint model_catalog_id_family_key unique (id, family);
exception when duplicate_table then null;
end $$;

-- Any row that already disagrees is a row no generator could have served, so it
-- is dropped rather than migrated to a family it was never chosen for.
delete from public.user_model_preferences p
where not exists (
  select 1 from public.model_catalog m
   where m.id = p.model_id and m.family = p.family
);

alter table public.user_model_preferences
  drop constraint if exists user_model_preferences_model_id_fkey;

do $$ begin
  alter table public.user_model_preferences
    add constraint user_model_preferences_model_family_fkey
    foreign key (model_id, family) references public.model_catalog (id, family)
    on update cascade on delete cascade;
exception when duplicate_object then null;
end $$;

-- The old comment claimed the generation path reads this table. It does not:
-- `supabase/functions/generate-video/index.ts` never sends a model, so every
-- run falls to the `veo3_fast` column default. Saying otherwise in the schema
-- is how the next person ships a bug.
comment on table public.user_model_preferences is
  'The model each user prefers per family. Stored only: the generation path does not read it yet, because generate-video does not forward a model to the provider. can_run_model remains the run-time authority when it does.';

-- ---------------------------------------------------------------------------
-- 2. The money tables were writable-in-principle by clients
-- ---------------------------------------------------------------------------
-- Supabase grants every privilege on the public schema to `anon` and
-- `authenticated` by default, so the only thing stopping a signed-in user from
-- inserting their own `credit_ledger` rows was the absence of an INSERT policy
-- on an RLS-enabled table. That held (the insert was refused), but it is one
-- carelessly written `for all` policy away from being free money, and the same
-- was true of the table that sets the price.
--
-- Reads stay: the billing history and `credit_balance()` need them, and RLS
-- already scopes the ledger to its owner while the catalogue is public by
-- design. Writes belong to `service_role` and to the security-definer functions
-- (`grant_credits`, `complete_generation`, `fail_generation`), which run as the
-- owner and are unaffected.
revoke insert, update, delete, truncate on public.credit_ledger from anon, authenticated;
revoke insert, update, delete, truncate on public.model_catalog from anon, authenticated;
