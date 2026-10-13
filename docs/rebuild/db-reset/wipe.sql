-- DESTRUCTIVE AND IRREVERSIBLE.
-- Erases the application schema and EVERY user account in this Supabase project.
-- Run preflight.sql first. Storage objects are removed separately by
-- wipe-storage.sh, because Supabase blocks deleting storage rows with SQL.
-- Afterwards the Go API recreates the schema by itself when it starts.
begin;

-- 1. Scheduled jobs from the old stack.
do $$
begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule(jobid) from cron.job;
  end if;
end
$$;

-- 2. Custom schemas, if any (the old app used public only).
do $$
declare s text;
begin
  for s in
    select nspname from pg_namespace
    where nspname !~ '^pg_' and nspname not in (
      'information_schema', 'public', 'auth', 'storage', 'extensions', 'graphql', 'graphql_public',
      'realtime', 'vault', 'pgsodium', 'pgsodium_masks', 'supabase_functions', 'supabase_migrations',
      'cron', 'net', 'pgbouncer', '_realtime', '_analytics', 'pg_catalog')
  loop
    execute format('drop schema %I cascade', s);
  end loop;
end
$$;

-- 3. The application schema: every table, function, policy and trigger in it.
drop schema public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;

-- 4. Forget the old Supabase migration history so the 133 legacy files can
--    never be replayed by mistake.
do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    truncate supabase_migrations.schema_migrations;
  end if;
end
$$;

-- 5. Every user. Identities, sessions and refresh tokens go with them.
delete from auth.users;

commit;
